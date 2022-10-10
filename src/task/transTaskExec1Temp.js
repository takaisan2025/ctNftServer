const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml"
]);

const EventEmitter = require('events')
EventEmitter.setMaxListeners(500)
const {
    queryNonce,
    insertNonce,
    updateNonce,
    delNonce
} = require("../mapper/NftNonceMapper");

const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL,
    isEmpty
} = require("../rules/rules");
const {
    accountSelectSelective,
    execSql,
    execSqlAll,
    responseFun,
    responseFunStr,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
let web3 = web3o;

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
const CtTransferExecutorAddress = "0xF41d25234dB41465450F5cCfE1e302A1fA0E2fEF";
const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[1];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
let gasPrice = "5000100000000";
let isGasPrice = false;
const ethUtil = require("ethereumjs-util");
var format = {language: "sql", indent: " "};

async function betchTransfer() {
    var params = {t_status: 1, t_from: "0x01063da4afFa46c59B9e1e1004Cd255CBC593FbE"};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatusAndNoFrom",
        params,
        format
    );
    sql = sql.replace('! =', '!=')
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    for (let retKey in transList) {
        // console.log(ret[retKey]);
        const {
            id,
            t_from,
            t_to,
            amount,
            reback_url,
            token_id,
            type,
            orderId,
            collectAddress,
            t_status,
            create_time,
            update_time
        } = transList[retKey];
        let accountDetail = accountSelectSelective(t_from);
        var params1 = {address: collectAddress};
        var sql1 = mybatisMapper.getStatement(
            "collect",
            "selectByAddress",
            params1,
            format
        );
        let collectDetail = await execSql(sql1)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("ERR:", err);
                return err;
            });
        let contractAddressDetail;
        if (collectDetail.owner.toLowerCase() == t_from.toLowerCase()) {
            contractAddressDetail = accountDetail;
        } else {
            contractAddressDetail = accountSelectSelective(collectDetail.owner);
        }
        let accountItem = await accountDetail.then((result) => {
            return result;
        });
        // try {
        let wallet;
        if (accountItem.private_key) {
            wallet = new ethers.Wallet(accountItem.private_key, customHttpProvider);
        } else {
            wallet = await ethers.Wallet.fromEncryptedJson(
                accountItem.keystore,
                accountItem.psd
            );
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

        }

        // 使用Provider 连接合约，将只有对合约的可读权限
        let transferTo = t_to;
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
        console.log("gasPrice:", gasPrice.toString());

        // 链上余额判断
        let balance = await wallet.provider.getBalance(t_from);
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        let etherString = ethers.utils.formatEther(balance);
        console.log("Balance: ", etherString);
        if (Number(etherString) < Number(String(1))) {
            let privateKey = contractAddressDetail.private_key;
            if (isEmpty(privateKey).flag) {
                continue;
            } else {
                let {err, hash} = await transfer(privateKey, ethers.utils.parseEther(String(1)), t_from);
                if (err != null) {
                    console.log("txTransfer faild");
                    continue;
                }
                console.log("tx Hash:", hash);
            }

        }

        // TODO 首先需要判断授权 ApproveAll
        let contractToken = new ethers.Contract(
            collectAddress,
            ERC1155Ctnft.abi,
            customHttpProvider
        );
        let contractWithSignerToken = contractToken.connect(wallet);

        let isApprovedForAll = await contractWithSignerToken.isApprovedForAll(
            t_from,
            CtTransferExecutorAddress
        );
        console.log("isApprovedForAll:", isApprovedForAll);
        if (isApprovedForAll == false) {
            // 进行授权
            let txApproveRet = await contractWithSignerToken.setApprovalForAll(
                CtTransferExecutorAddress,
                true
            );
            let recept1 = await customHttpProvider.waitForTransaction(txApproveRet.hash);

            console.log("txApprove:", recept1);

        }

        // 如果没有授权, 需要先授权
        let contract = new ethers.Contract(
            CtTransferExecutorAddress,
            CtTransferExecutor.abi,
            customHttpProvider
        );

        // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
        let contractWithSigner = contract.connect(wallet);
        //safeTransferFrom(from, to, data.tokenId, transfer, "");

        let assetClass;
        if (type == 9) {
            assetClass = id_fun("ERC721");
        } else if (type == 10 || type == 12) {
            assetClass = id_fun("ERC1155");
        } else {
            continue;
        }

        let transferDirection = assetClass;
        let transferType = assetClass;
        let orderIdEcc = `0x${ethUtil
            .keccak256(Buffer.from(orderId))
            .toString("hex")}`;
        let data = orderIdEcc;
        let gasLimitRet = await contractWithSigner.estimateGas
            .transfer(
                assetClass,
                collectAddress,
                t_from,
                transferTo,
                token_id,
                orderIdEcc,
                amount,
                transferDirection,
                transferType,
                data
            )
            .then((ret) => {
                return {err: null, gasLimit: ret}
            })
            .catch((err) => {
                return {err: err.reason, gasLimit: null}
            });
        if (gasLimitRet.err != null) {
            console.log(gasLimitRet.err);
            // console.log(minted721TokenStr == gasLimitRet.err)
            if ("execution reverted: ERC1155: insufficient balance for transfer" == gasLimitRet.err) {
                let trans_from_obj = {
                    t_status: 3, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                await execSql(sqlUp);
            } else if ("ErrFunds must less than 0.105 ETH" == gasLimitRet.err) {
                // 计算手续费导致的错误, 稍后重试
            } else if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                // 计算手续费导致的错误, 稍后重试
                let trans_from_obj = {
                    t_status: 6, // 上链成功
                    id: id
                };

                var paramsUp1 = trans_from_obj;
                var sqlUp1 = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp1,
                    format
                );
                await execSql(sqlUp1);
            } else if ("replacement fee too low" == gasLimitRet.err) {
                await updateNonce(t_from, transactionCount1Mint + 1);
            } else {
                await delNonce(t_from);
            }
            continue;
        } else {

            let tx;
            let txRet;
            let transactionCount1Mint;
            //这里通过数据库查询来获取nonce
            var nonceResult = await queryNonce(t_from);
            let currTime = new Date().getTime();
            if (nonceResult.length == 0) {
                transactionCount1Mint =
                    await customHttpProvider.getTransactionCount(t_from, "latest");
                await insertNonce(t_from, transactionCount1Mint);
            } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
                // 超时,重新获取nonce
                console.log("超时,重新获取nonce.....................");
                transactionCount1Mint =
                    await customHttpProvider.getTransactionCount(t_from, "latest");
                await updateNonce(t_from, transactionCount1Mint);
            } else {
                transactionCount1Mint = nonceResult[0].nonce;
            }
            let gasLimit = gasLimitRet.gasLimit;
            console.log("gasLimit:", gasLimit.toString());
            let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
            console.log("gasPrice*:", neceliby);

            // gasPrice = 0;
            let overrides = {
                // The maximum units of gas for the transaction to use
                gasLimit: web3.utils.numberToHex(gasLimit),
                // The price (in wei) per unit of gas
                gasPrice: web3.utils.numberToHex(gasPrice),
                // The nonce to use in the transaction
                // nonce: nonce,
                nonce: transactionCount1Mint,
                // The amount to send with the transaction (i.e. msg.value)
                // value: utils.parseEther('1.0'),
                // The chain ID (or network ID) to use
                // chainId: 27
            };
            // 设置一个新值，返回交易

            txRet = await contractWithSigner
                .transfer(
                    assetClass,
                    collectAddress,
                    t_from,
                    transferTo,
                    token_id,
                    orderIdEcc,
                    amount,
                    transferDirection,
                    transferType,
                    data,
                    overrides
                )
                .then((ret) => {
                    return {err: null, data: ret};
                })
                .catch((err) => {
                    console.log("err:", err.reason);
                    return {err: err.reason, data: null};
                });
            tx = txRet.data;
            // console.log("txRet:", txRet);
            // console.log("txTransForm:", tx);
            if (txRet.err == null) {
                // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                // save db
                let trans_from_obj = {
                    hash: tx.hash,
                    t_status: 5, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                let result = await execSql(sqlUp)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(responseFun(500, err, ""), id);
                    });
                console.log("update TransFrom data:", result);
                await updateNonce(t_from, transactionCount1Mint + 1)
                continue;
            } else {
                if ("execution reverted: ERC1155: insufficient balance for transfer" == txRet.err) {
                    let trans_from_obj = {
                        t_status: 3, // 上链成功
                        id: id
                    };
                    console.log("nftUpdateSelective:", trans_from_obj);

                    var paramsUp = trans_from_obj;
                    var sqlUp = mybatisMapper.getStatement(
                        "trans_form_list",
                        "updateByPrimaryKeySelective",
                        paramsUp,
                        format
                    );
                    await execSql(sqlUp);
                    continue;
                }
                if ("ErrFunds must less than 0.105 ETH" == txRet.err) {
                    // 计算手续费导致的错误, 稍后重试
                    continue;
                }
                if ("ErrFunds must less than 0.105 ETH" == txRet.err) {
                    // 计算手续费导致的错误, 稍后重试
                    continue;
                }
                if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                    // 计算手续费导致的错误, 稍后重试
                    let trans_from_obj = {
                        t_status: 6, // 上链成功
                        id: id
                    };

                    var paramsUp1 = trans_from_obj;
                    var sqlUp1 = mybatisMapper.getStatement(
                        "trans_form_list",
                        "updateByPrimaryKeySelective",
                        paramsUp1,
                        format
                    );
                    await execSql(sqlUp1);
                    continue;
                }
                if ("replacement fee too low" == txRet.err) {
                    //手续费不足
                    await updateNonce(t_from, transactionCount1Mint + 1);
                    continue;
                }
                //手续费不足
                console.error("txRet.err", txRet.err);
                await delNonce(t_from);
                continue;

            }
        }
    }
    console.log("betchTransfer All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchTransfer Start !!")
        betchTransfer()
    }, 2000);
}

function id_fun(str) {
    return `0x${ethUtil
        .keccak256(Buffer.from(str))
        .toString("hex")
        .substring(0, 8)}`;
}

async function transfer(privateKey, value, toAddress) {
    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    // console.log("nonce: " + nonce);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.toHex(value),
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        console.log("recept1:", recept1);
        if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            throw {message: "Transaction Reverted"};
        }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

function formatTime(date) {
    console.log("formatTime", date)
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`

}

//TEST
betchTransfer();
module.exports = {
    betchTransfer
};
// node src\task\transTaskExec1Temp.js