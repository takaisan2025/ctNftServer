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
    var params = {t_status: 5, t_from: "0x01063da4afFa46c59B9e1e1004Cd255CBC593FbE"};
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

async function betchCallFund() {
    var params = {t_status: 6};
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

    let urls = [];
    for (let retKey in transList) {

        const {
            token_id,
            id,
            hash,
            update_time,
            orderId,
            reback_url
        } = transList[retKey];
        var formdata = new FormData()

        // if (reback_url == "" || reback_url == null) {
        //     continue;
        // }

        formdata.append("key", "qianyidata");
        // console.log(tokenId)
        formdata.append("tokenId", token_id);
        formdata.append("orderId", orderId);
        formdata.append("mintDate", formatTime(update_time));
        formdata.append("status", "true");
        formdata.append("hash", hash);
        // console.log("formdata:", formdata)
        var requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow"
        };

        urls.push({
            url: reback_url,
            id: id,
            param: requestOptions
        });

        handleFetchQueue(urls, max, callbackByCall);
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchCallFund Start !!")
        betchCallFund()
    }, 2000)
}

const max = 5;

function handleFetchQueue(urls, max, callback) {
    const urlCount = urls.length;
    const requestsQueue = [];
    const results = [];
    let i = 0;
    const handleRequest = (url) => {
        if (url != undefined) {
            // console.log("回调urlDetail:", url);
            const req = fetch(url.url, url.param).then(res => {
                console.log("回调返回原始内容status:", res.status);
                console.log("回调返回原始内容statusText:", res.statusText);
                return res.json();
            }).then(res => {
                console.log("回调返回处理结果:", res);
                console.log('当前并发： ');
                console.log(requestsQueue);
                const len = results.push({data: res, id: url.id, err: null});
                if (len < urlCount && i + 1 < urlCount) {
                    requestsQueue.shift();
                    handleRequest(urls[++i])
                } else if (len === urlCount) {
                    'function' === typeof callback && callback(results)
                }
            }).catch(e => {
                console.log("回调错误:", e, ",id", url.id);
                results.push({err: e, data: null, id: url.id})
            });
            if (requestsQueue.push(req) < max) {
                handleRequest(urls[++i])
            }
        }

    };
    handleRequest(urls[i])
}

async function callbackByCall(result) {
    console.log('run callback');
    console.log(result);
    for (const resultElement of result) {
//处理响应结果
        let response = resultElement.data
        //处理响应结果
        console.log(response);

        if (response != null && response.status == 1) {

            let trans_from_obj = {
                t_status: 4, // 上链成功
                id: resultElement.id
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
                    console.error(responseFun(500, err, ""), resultElement.id);
                    return responseFun(500, err, "");
                });
        } else if (response != null && response.msg == "作品不存在") {

            let trans_from_obj = {
                t_status: 8, // 上链成功
                id: resultElement.id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = mybatisMapper.getStatement(
                "trans_form_list",
                "updateByPrimaryKeySelective",
                paramsUp,
                format
            );
            let result = await execSql(sqlUp);
        } else {
            // console.log("回调接口失败,", resultElement.id);
            //
            // let trans_from_obj = {
            //     t_status: 8, // 上链成功
            //     id: resultElement.id
            // };
            // console.log("nftUpdateSelective:", trans_from_obj);
            //
            // var paramsUp = trans_from_obj;
            // var sqlUp = mybatisMapper.getStatement(
            //     "trans_form_list",
            //     "updateByPrimaryKeySelective",
            //     paramsUp,
            //     format
            // );
            // let result = await execSql(sqlUp);
        }

    }
};

async function betchCallFund1() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 6, t_from: "0x01063da4afFa46c59B9e1e1004Cd255CBC593FbE"};

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
            console.error(responseFunStr(500, err, {}));
        });
    for (let retKey in transList) {
        let {
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
        if (hash == null) {
            hash = "none";
        }
        formdata.append("hash", hash);
        // console.log("formdata:", formdata)
        var requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow",
        };

        let responseRet = await fetch(reback_url, requestOptions)
            .then((response) => {
                console.log("回调返回原始内容status:", response.status);
                console.log("回调返回原始内容statusText:", response.statusText);
                return response.json();
            })
            .then((response) => {
                console.log("回调返回处理结果:", response);
                return {data: response};
            })
            .catch((err) => {
                console.log("回调错误:", err, ",orderId", orderId);
                return {data: null, err: err};
            });
        //处理响应结果
        let response = responseRet.data
        //处理响应结果
        console.log(response);

        if (response != null && response.status == 1) {

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
        } else if (response != null && response.msg == "作品不存在") {

            let trans_from_obj = {
                t_status: 8, // 上链成功
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
            let result = await execSql(sqlUp);
        } else {
            console.log("回调接口失败,", orderId);
            //
            let trans_from_obj = {
                t_status: 8, // 上链成功
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
            let result = await execSql(sqlUp);
        }
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchCallFund Start !!")
        betchCallFund1()
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
betchHashQuery()
// betchCallFund();
betchCallFund1();

// node src\task\transTaskExec2.js