const {
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeySys = GlobalConfig.MINT_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ethers = require("ethers");
const ABI_const = require("../contract/ABI_const");
const {contract_static_call} = require("../contract/ChainCall");
const {responseFunStr} = require("../mapper/account");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const {customHttpProvider} = require("./taskConst");
const tFeeBetchTransferFlag = "tFeeBetchTransfer_START"

async function tFeeBetchTransfer() {
    if (await getString(tFeeBetchTransferFlag) == "1") {
        console.log('===================wait start tFeeBetchTransfer')
        return
    } else {
        await setString(tFeeBetchTransferFlag, "1", 60)
        console.time("tFeeBetchTransfer");
        var params = {t_status: 1, is_pay: 1};
        var sql = get_mysql(
            "NftChargeListMapper",
            "selectByStatusAndPay",
            params
        ).result;
        let transList = []
        let transList_ret = await exec_sql_all(sql);
        if (transList_ret.err != null) {
            console.log("ERR:", transList_ret.err);
        }

        transList = transList_ret.result
        for (let retKey in transList) {
            // console.log(ret[retKey]);
            const {
                id,
                t_to,
                pay_amount,
                rate
            } = transList[retKey];

            // 使用Provider 连接合约，将只有对合约的可读权限
            let transactionCount1Mint;

            // 这里首先判断toAddress的实名情况, 否则转手续费会失败
            if (GlobalConfig.CAN_AUTH) {
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let isAuth = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "authsSingle",
                    customHttpProvider,
                    [address]
                );
                if (isAuth.data != true) {
                    console.log(responseFunStr(500, "用户信息未认证或过期,请稍后重试!", {}))
                    return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
                }
            }

            let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);

            let txs = {
                to: t_to,
                // ... or supports ENS names
                // to: "ricmoo.firefly.eth"
                // nonce: transactionCount1Mint,
                // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                // use this convenience function to convert ether to wei.
                // gasPrice: Web3.utils.numberToHex(0),
                value: ethers.utils.parseEther((pay_amount * rate).toString()),
            };

            let tx = await walletSys.sendTransaction(txs);
            console.log("txTransfer: :", tx.hash);

            console.log("hash:", tx.hash);
            // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
            // save db
            let trans_from_obj = {
                hash: tx.hash,
                t_status: 5, // 上链成功
                id: id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = get_mysql(
                "NftChargeListMapper",
                "updateByPrimaryKeySelective",
                paramsUp
            ).result;
            let result02 = await exec_sql(sqlUp);
            if (result02.err != null) {
                console.error(responseFun(500, result02.err, ""), id);
            }
            console.log("update TransFrom data:", result02.result);

        }
        await removeString(tFeeBetchTransferFlag)
        console.timeEnd("tFeeBetchTransfer")
    }
}

const tFeeBetchHashQueryFlag = "tFeeBetchHashQuery_START"

async function tFeeBetchHashQuery() {
    if (await getString(tFeeBetchHashQueryFlag) == "1") {
        console.log('===================wait start tFeeBetchHashQuery')
        return
    } else {
        await setString(tFeeBetchHashQueryFlag, "1", 60)
        console.time("tFeeBetchHashQuery");
        var params = {t_status: 5, is_pay: 1};
        var sql = get_mysql(
            "NftChargeListMapper",
            "selectByStatusAndPay",
            params
        ).result;

        let transList = []
        let transList_ret = await exec_sql_all(sql);
        if (transList_ret.err != null) {
            console.log("ERR:", transList_ret.err);
        }

        transList = transList_ret.result
        for (let retKey in transList) {
            console.log(transList[retKey]);
            const {
                id,
                t_to,
                pay_amount,
                rate,
                hash
            } = transList[retKey];
            let recept = await customHttpProvider.getTransactionReceipt(hash);

            // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
            // save db
            let t_statusStorage;
            if (recept == null) {
                // t_statusStorage = 7;
                console.log("查询hash结果为空,", hash);
                continue;
            } else {
                if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                    console.log("Transaction Reverted");
                }
                if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                    t_statusStorage = 7;
                } else {
                    t_statusStorage = 4;  // 这里没有回调, 直接给4
                }
            }

            let trans_from_obj = {
                t_status: t_statusStorage, // 6 成功,7 失败   4 成功
                id: id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = get_mysql(
                "NftChargeListMapper",
                "updateByPrimaryKeySelective",
                paramsUp
            ).result;
            let result03 = await exec_sql(sqlUp);
            if (result03.err != null) {
                console.error(responseFun(500, result03.err, ""), id);
            }
        }
        await removeString(tFeeBetchHashQueryFlag)
        console.timeEnd("tFeeBetchHashQuery")
    }
}

module.exports = {
    tFeeBetchTransfer,
    tFeeBetchHashQuery
};
// node src/task/transFeeTask.js
