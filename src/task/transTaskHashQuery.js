const {
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};

const ethers = require("ethers");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const ethUtil = require("ethereumjs-util");
const {get_mysql} = require("../db/genSql");

async function betchHashQuery() {
    let params = {t_status: 5};
    let sql = get_mysql(
        "trans_form_list",
        "selectByStatus",
        params
    ).result;
    let transList_ret = await exec_sql_all(sql)
    let transList = []
    if (transList_ret.err != null) {
        console.trace("ERR:", transList_ret.err);
    }
    transList = transList_ret.result
    for (let retKey in transList) {
        console.log(transList[retKey]);
        const {
            id,
            update_time,
            hash
        } = transList[retKey];
        if (!hash || hash == "" || hash == null) {
            continue;
        }
        try {


            let recept = await web3.eth.getTransactionReceipt(hash);
            let currTime = new Date().getTime();
            if (currTime - update_time.getTime() < 10000) {   // hash产生不到10s自动跳过
                continue;
            } else {
                let t_statusStorage;
                if (recept != null && recept.status == true) {
                    t_statusStorage = 6;
                } else {

                    // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                    // save db
                    // if (recept.data.transaction == null || recept.data.transaction.status == null) {
                    if (currTime - update_time.getTime() < 60000) {
                        continue;
                    } else {
                        t_statusStorage = 1;
                        console.log("查询hash结果false,", hash);
                    }
                }
                let trans_from_obj = {
                    t_status: t_statusStorage, // 6 成功,7 失败
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                let paramsUp = trans_from_obj;
                let sqlUp = get_mysql(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp
                ).result;
                await exec_sql(sqlUp);

            }
        } catch (e) {
            console.error(e)
            console.trace(e)
            continue;
        }

    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery()
    }, 2000)
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
            throw "Transaction Reverted";
        }
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
betchHashQuery()
// node src\task\transTaskExec2.js
