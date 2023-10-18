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
const {customHttpProvider} = require("./taskConst");
const ethUtil = require("ethereumjs-util");
const {exec_sql_all} = require("../controller/ctnft");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");
const {get_mysql} = require("../db/genSql");

async function betchTransfer() {

    var sql
    var params;
    params = {status: 0, offset: 1, limit: 20};
    sql = get_mysql(
        "NftTransactionMapper",
        "selectByStatus",
        params
    ).result;

    // console.log("betchTransferThread", sql)
    let transList_ret01 = await exec_sql_all(sql);
    if (transList_ret01.err != null) {
        console.trace("ERR:", transList_ret01.err);
        return transList_ret01.err;
    }
    let transList = transList_ret01.result

    let auths = [];
    let orderIds = [];

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
        let funData = JSON.parse(origin_data);
        auths.push(funData[0]);
        orderIds.push(funData[1]);
    }

    console.log(auths);
    console.log(orderIds);
    try {
        // 直接上链
        let wallet;
        // 这里暂时指定私钥, 后面不能指定
        let privateKey = GlobalConfig.AUTH_CONTROLLER_PK;
        // let privateKey = wallet.privateKey
        wallet = new ethers.Wallet(privateKey, customHttpProvider);
        let methodName = "authenticationBetch";
        let abiName = "AuthController"

        // 进行合约交互
        let contractToken = new ethers.Contract(
            GlobalConfig.AUTH_CONTROLLER_ADDRESS,
            ABI_const[abiName].abi,
            customHttpProvider
        );
        let contractWithSignerToken = contractToken.connect(wallet);
        let gasLimitRet = await contractWithSignerToken.estimateGas[methodName](
            ...[auths, orderIds]
        ).then((ret) => {
            return {err: null, gasLimit: ret}
        }).catch((err) => {
            return {err: err.reason, gasLimit: null}
        });
        if (gasLimitRet.err != null) {

            console.trace(gasLimitRet.err);

        } else {
            let gasLimitA = gasLimitRet.gasLimit
            let txCallRet = await contractWithSignerToken[methodName](
                    ...[auths, orderIds],
                {
                    // The maximum units of gas for the transaction to use
                    gasLimit: web3.utils.numberToHex(gasLimitA),
                    // The price (in wei) per unit of gas
                    // gasPrice: web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
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
                    console.log("update TransFrom data:", result02.result);
                }


            } else {
                //手续费不足
                console.trace("txCallRet.err", txCallRet.err);

            }
        }8
    } catch
        (e) {
        console.error(e)
        console.trace(e)
    }

    console.log("betchTransfer All Done!");
}

//TEST
betchTransfer();
// node src\task\submitTransactionBetchTask.js
