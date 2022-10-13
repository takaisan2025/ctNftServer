const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml"
]);
const EventEmitter = require('events')
EventEmitter.setMaxListeners(500)
const {
    graphiqlHashQuery
} = require("../broapi/broapi");
const {
    queryNonce,
    insertNonce,
    updateNonce,
    delNonce
} = require("../mapper/NftNonceMapper");


const {
    accountSelectSelective,
    execSql,
    execSqlAll,
    responseFun,
    responseFunStr,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const FormData = require("form-data");
const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
// let web3o = new Web3("https://exploder.coozw.com/blockChain");
let web3 = web3o;
const fetch = require("node-fetch");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};

const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[1];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const ethUtil = require("ethereumjs-util");
var format = {language: "sql", indent: "  "};

async function betchHashQuery() {
    var params = {t_status: 5};
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
        console.log(transList[retKey]);
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
            update_time,
            hash
        } = transList[retKey];
        if (!hash || hash == "" || hash == null) {
            continue;
        }
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
                    await delNonce(t_from);
                    t_statusStorage = 1;
                    console.log("查询hash结果false,", hash);
                }
            }
            let trans_from_obj = {
                t_status: t_statusStorage, // 6 成功,7 失败
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
betchHashQuery()
// node src\task\transTaskExec2.js