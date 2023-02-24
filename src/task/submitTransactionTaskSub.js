const {
    isEmpty
} = require("../rules/rules");
const {
    exec_sql,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const gasConfig = require("../config/gasConfig.json");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ABI_const = require("../contract/ABI_const.js");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
const ethers = require("ethers");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const ethUtil = require("ethereumjs-util");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");
const {get_mysql} = require("../db/genSql");

async function betchTransfer() {
    let transList = JSON.parse(process.env.spTransList);

    for (let retKey in transList) {
        const {
            id,
            from, to, data,
            status, hash, block_number,
            type, reback_url, is_reback,
            order_id, vm_err, value,
            origin_data, contract_address, method,
            origin_value, remark
        } = transList[retKey];
        try {
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {address: from})
            let sUserAccountDetail01 = await exec_sql(sqlResult.result);
            let sUserAccountDetail = sUserAccountDetail01.result
            // 直接上链
            // try {
            let wallet;

            // let decWalletResult = await getPriKey(sUserAccountDetail, sUserAccountDetail.psd);
            // if (decWalletResult.err != null) {
            //     return PasswordError;
            // } else {
            //     wallet = decWalletResult.result;
            // }

            // 这里暂时指定私钥, 后面不能指定
            let privateKey = GlobalConfig.AUTH_CONTROLLER_PK;
            // let privateKey = wallet.privateKey
            wallet = new ethers.Wallet(privateKey, customHttpProvider);
            let methodName = method.split("#")[1]
            let abiName = method.split("#")[0]

            // 进行合约交互
            let contractToken = new ethers.Contract(
                to,
                ABI_const[abiName].abi,
                customHttpProvider
            );
            let funData = JSON.parse(origin_data);
            console.log(funData[0])
            console.log(funData[1])
            console.log(to)
            let contractWithSignerToken = contractToken.connect(wallet);
            let gasLimitRet = await contractWithSignerToken.estimateGas[methodName](
                ...funData
            ).then((ret) => {
                return {err: null, gasLimit: ret}
            }).catch((err) => {
                return {err: err.reason, gasLimit: null}
            });
            if (gasLimitRet.err != null) {

                console.trace(gasLimitRet.err);
                // console.log(minted721TokenStr == gasLimitRet.err)
                let trans_from_obj = {
                    status: 2, // 上链失败
                    id: id,
                    vm_err: gasLimitRet.err
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = get_mysql(
                    "NftTransactionMapper",
                    "updateByPrimaryKeySelective",
                    paramsUp
                ).result;
                await exec_sql(sqlUp);
                continue;


            } else {
                let gasLimitA = gasLimitRet.gasLimit
                let txCallRet = await contractWithSignerToken[methodName](
                    ...funData,
                    {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimitA),
                        // The price (in wei) per unit of gas
                        gasPrice: web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    }
                ).then((ret) => {
                    return {err: null, data: ret};
                })
                    .catch((err) => {
                        console.trace("err:", err.reason);
                        return {err: err.reason, data: null};
                    });
                tx = txCallRet.data;
                // console.log("txRet:", txRet);
                // console.log("txTransForm:", tx);
                if (txCallRet.err == null) {
                    // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                    // save db
                    let trans_from_obj = {
                        hash: tx.hash,
                        status: 1, // 上链成功
                        id: id
                    };
                    console.log("nftUpdateSelective:", trans_from_obj);

                    var paramsUp = trans_from_obj;
                    var sqlUp = get_mysql(
                        "NftTransactionMapper",
                        "updateByPrimaryKeySelective",
                        paramsUp
                    ).result;
                    let result02 = await exec_sql(sqlUp);
                    if (result02.err != null) {
                        console.trace(responseFun(500, result02.err, ""), id);
                        continue;
                    }
                    console.log("update TransFrom data:", result02.result);
                    continue;
                } else {
                    if ("execution reverted: ERC1155: insufficient balance for transfer" == txCallRet.err) {
                        let trans_from_obj = {
                            t_status: 3, // 上链成功
                            id: id
                        };
                        console.log("nftUpdateSelective:", trans_from_obj);

                        var paramsUp = trans_from_obj;
                        var sqlUp = get_mysql(
                            "NftTransactionMapper",
                            "updateByPrimaryKeySelective",
                            paramsUp
                        ).result;
                        await exec_sql(sqlUp);
                        continue;
                    }
                    if ("ErrFunds must less than 0.105 ETH" == txCallRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                        continue;
                    }
                    if ("ErrFunds must less than 0.105 ETH" == txCallRet.err) {
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
                        var sqlUp1 = get_mysql(
                            "NftTransactionMapper",
                            "updateByPrimaryKeySelective",
                            paramsUp1
                        ).result;
                        await exec_sql(sqlUp1);
                        continue;
                    }
                    if ("replacement fee too low" == txCallRet.err) {
                        //手续费不足
                        continue;
                    }
                    //手续费不足
                    console.trace("txCallRet.err", txCallRet.err);
                    continue;

                }
                continue;
            }
        } catch
            (e) {
            console.error(e)
            console.trace(e)
            continue;
        }

    }

    console.log("betchTransfer All Done!");
    process.exit();
}

function id_fun(str) {
    return `0x${ethUtil
        .keccak256(Buffer.from(str))
        .toString("hex")
        .substring(0, 8)}`;
}

async function transfer(privateKey, value, toAddress) {
    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
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
        // let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        // console.log("recept1:", recept1);
        // if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
        //     throw "Transaction Reverted";
        // }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.trace("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
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
// node src\task\transTaskExec1.js
