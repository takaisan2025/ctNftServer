// const {
//     queryNonce,
//     insertNonce,
//     updateNonce
// } = require("../mapper/NftNonceMapper");

const {
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
let privateKeySys = GlobalConfig.MINT_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ethers = require("ethers");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

async function betchTransfer() {
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
            console.error(responseFun(500, err, ""), id);
        } else {
            return result02.result;
        }
        console.log("update TransFrom data:", result02.result);

    }
    console.log("betchTransfer All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchTransfer Start !!")
        betchTransfer()
    }, 2000)
}

async function betchHashQuery() {
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
            formatTime(new Date());
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
        } else {
            return result03.result;
        }
    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery()
    }, 2000)
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
betchHashQuery();

// node src/task/transFeeTask.js
