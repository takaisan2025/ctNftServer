const mybatisMapper = require("mybatis-mapper");
// mybatisMapper.createMapper(["./xml/nft.xml"]);
mybatisMapper.createMapper([
    "./xml/collect.xml",
    "./xml/nft.xml",
    "./xml/TransFormListMapper.xml"
]);
const {
    accountSelectSelective,
    nftSelectSelective,
    nftUpdateSelectiveStatus,
    nftSelectSelectiveStatus,
    nftSelectSelectiveCreator,
    nftInsertSelective,
    nftUpdateSelective,
    execSql,
    execSqlAll,
    nftUpdateSelectiveIsFinish,
    responseFun,
    responseFunStr,
} = require("../controller/ctnft");

const GlobalConfig = require("../config/GlobalConfig.json");

const FormData = require("form-data");
const web3 = require("web3");
const fetch = require("node-fetch");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const GlobalConfig = require("../config/GlobalConfig.json");
const ethers = require("ethers");
// 通过定制 URL 连接 :

let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[1];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
let gasPrice = "5000100000000";
let isGasPrice = false;

async function betchTransfer() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 1};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatus",
        params,
        format
    );
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
        let accountItem = await accountDetail.then((result) => {
            return result;
        });
        // try {
        let wallet = await ethers.Wallet.fromEncryptedJson(
            accountItem.keystore,
            accountItem.psd
        );
        // address: wallet.address,
        // privateKey: wallet.privateKey,
        wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

        // 使用Provider 连接合约，将只有对合约的可读权限
        let transferTo = t_to;
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }

        if (type == 10 || type == 12) {
            let contract = new ethers.Contract(
                collectAddress,
                ERC1155Ctnft.abi,
                customHttpProvider
            );

            // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
            let contractWithSigner = contract.connect(wallet);
            //safeTransferFrom(from, to, data.tokenId, transfer, "");
            let gasLimit = await contractWithSigner.estimateGas
                .safeTransferFrom(
                    t_from,
                    transferTo,
                    token_id,
                    amount,
                    "0x"
                )
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                    return "";
                });
            console.log("gasLimit:", gasLimit.toString());
            let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
            console.log("gasPrice*:", neceliby);
            let balance = await wallet.provider.getBalance(t_from);
            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
            // let etherString = ethers.utils.formatEther(balance);
            console.log("Balance: ", balance);
            if (balance < neceliby) {
                let {err, hash} = await transfer(neceliby.toString(), t_from);
                if (err != null) {
                    //
                    console.log("txTransfer faild");
                    continue;
                }
                console.log("tx Hash:", hash);
            }
            let transactionCount1Mint =
                await customHttpProvider.getTransactionCount(t_from, "latest");
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
            let tx = await contractWithSigner
                .safeTransferFrom(
                    t_from,
                    transferTo,
                    token_id,
                    amount,
                    "0x",
                    overrides
                )
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                    return err;
                });
            // console.log("tx:", tx.toString().startsWith('0x'))
            console.log("tx:", tx);

            console.log("hash:", tx.hash);
            // 操作还没完成，需要等待挖矿
            let recept = await customHttpProvider
                .waitForTransaction(tx.hash)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                });
            console.log(recept);
            if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                throw {message: "Transaction Reverted"};
            }

            // let recept1 = await tx.wait();
            // save db
            let trans_from_obj = {
                hash: tx.hash,
                t_status: 2, // 上链成功
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
        } else if (type === 9) {
            // 1155
            let contract = new ethers.Contract(
                collectAddress,
                ERC721Ctnft.abi,
                customHttpProvider
            );
            console.log("ERROR:", "no implements");
        } else if (type == 1) {
            // 1155
            let contract = new ethers.Contract(
                collectAddress,
                CtnftMToken.abi,
                customHttpProvider
            );
            console.log("ERROR:", "no implements");
        } else {
            console.log("ERROR:", "没有找到匹配的合约信息");
        }
    }
    console.log("betchMint All Done!");
    betchCallFund();
    return;
}

async function transfer(value, toAddress) {
    let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);
    // console.log("nonce: " + nonce);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.numberToHex(value),
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

async function betchCallFund() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 2};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatus",
        params,
        format
    );
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.error(responseFunStr(500, err, {}));
        });
    for (let retKey in transList) {
        const {
            token_id,
            id,
            hash,
            update_time,
            orderId,
            reback_url
        } = transList[retKey];
        var formdata = new FormData();

        if (reback_url == "" || reback_url == null) {
            continue;
        }

        formdata.append("key", "qianyidata");
        // console.log(tokenId)
        formdata.append("tokenId", token_id);
        formdata.append("orderId", orderId);
        formdata.append("mintDate", formatTime(update_time));
        formdata.append("status", "true");
        formdata.append("hash", hash);
        console.log("formatTime(update_time)", formatTime(update_time))
        var requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow",
        };

        let response = await fetch(reback_url, requestOptions)
            .then((response) => {
                return response.json();
            })
            .then((response) => {
                return response;
            })
            .catch((err) => {
                console.log("Call Faild  reCall:", err);
            });
        //处理响应结果
        console.log(response);
        if (response.status == 1) {

            let trans_from_obj = {
                t_status: 4, // 上链成功
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
                    return responseFun(500, err, "");
                });
        } else if (response.msg == "作品不存在") {
        } else {
            console.log("回调接口失败,", orderId);
        }
    }
    console.log("betchCallFund All Done!");
    return;
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
betchCallFund();
