const {
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri
const Web3 = require("web3");

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ethers = require("ethers");
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
    setLock, renewLock, releaseLock,
} = require("../redis/redis-client");
const {sendAtPendingNonce} = require("../chain/signedOrderSender");
const {hasReservedTransferNonce} = require("../chain/transferNonceReservation");
const nonceLocks = {setLock, renewLock, releaseLock};
const {customHttpProvider} = require("./taskConst");
const {auths_single} = require("../services/accountService");
const {RESPONSE_STATUS} = require("../chain/responseError");
const tFeeBetchTransferFlag = "tFeeBetchTransfer_START"
const erc20ABI = [
    "function transfer(address to, uint256 amount) public returns (bool)"
];

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
                rate,
                type
            } = transList[retKey];

            // 使用Provider 连接合约，将只有对合约的可读权限

            // 这里首先判断toAddress的实名情况, 否则转手续费会失败
            if (GlobalConfig.CAN_AUTH) {
                let isAuth = await auths_single(t_to);
                if (isAuth.data != true) {
                    console.log(responseFunStr(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}))
                    return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
                }
            }

            let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);

            let txs;
            let tx;

            switch (type) {
                case "WCT":
                    let DatatToken = '0xe849E0f956f2c67C1dCd46D606F03F1C65f18449'
                    // 2. 设置 ERC-20 代币合约地址 & 目标地址
                    const tokenAddress = DatatToken; // ERC-20 代币合约地址
                    const recipient = t_to; // 目标接收地址
                    const amount = ethers.utils.parseEther((pay_amount * rate).toString()); // 发送 10 个代币（假设 18 位小数）

                    // 3. 创建合约实例
                    const erc20 = new ethers.Contract(tokenAddress, erc20ABI, walletSys);

                    // 4. 发送交易
                    tx = await sendAtPendingNonce({
                        locks: nonceLocks, provider: customHttpProvider,
                        address: walletSys.address,
                        hasReservation: nonce => hasReservedTransferNonce(walletSys.address, nonce),
                        send: nonce => erc20.transfer(recipient, amount, {
                            nonce,
                            maxFeePerGas: Web3.utils.numberToHex(4800e9),
                            maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
                        })
                    });
                    if (tx.action !== "sent") continue;
                    tx = tx.tx;
                    console.log("WCT 交易发送中:", tx.hash);
                    break
                default:
                    txs = {
                        to: t_to,
                        // ... or supports ENS names
                        // to: "ricmoo.firefly.eth"
                        // nonce: transactionCount1Mint,
                        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                        // use this convenience function to convert ether to wei.
                        // gasPrice: Web3.utils.numberToHex(0),
                        maxFeePerGas: Web3.utils.numberToHex(4800e9),
                        maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
                        value: ethers.utils.parseEther((pay_amount * rate).toString()),
                    };
                    tx = await sendAtPendingNonce({
                        locks: nonceLocks, provider: customHttpProvider,
                        address: walletSys.address,
                        hasReservation: nonce => hasReservedTransferNonce(walletSys.address, nonce),
                        send: nonce => walletSys.sendTransaction({...txs, nonce})
                    });
                    if (tx.action !== "sent") continue;
                    tx = tx.tx;
                    console.log("Default 交易发送中:", tx.hash);
                    break
            }

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
                console.error(responseFun(RESPONSE_STATUS.ERROR, result02.err, ""), id);
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
                console.error(responseFun(RESPONSE_STATUS.ERROR, result03.err, ""), id);
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
