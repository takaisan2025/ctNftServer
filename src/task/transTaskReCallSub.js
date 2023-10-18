const {
    exec_sql,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const FormData = require("form-data");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
// let web3 = new Web3("https://exploder.coozw.com/blockChain");
const fetch = require("node-fetch");
const {formatTime} = require("./taskConst");
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
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
async function betchCallFund1() {
    // 设置列表

    // let transList = JSON.parse(await getString("spTransList" + process.env.spTransList_index));
    let transList = JSON.parse(await getString("spTransList"));
    // console.log('transList', transList)
    // console.log('process.env.spTransList_index', process.env.spTransList_index)
    // let transList = JSON.parse(process.env.spTransList);
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

        try {
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
            const requestOptions = {
                method: "POST",
                body: formdata,
                redirect: "follow",
                timeout: 2000
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
                    console.trace("回调错误:", err, ",orderId", orderId);
                    return {data: null, err: err};
                });
            //处理响应结果
            let response = responseRet.data
            //处理响应结果
            console.log(response);

            if (response != null && (response.status == 1 || response.status == 200)) {

                let trans_from_obj = {
                    t_status: 4, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = get_mysql(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp
                ).result;
                await exec_sql(sqlUp)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.trace(responseFun(500, err, ""), id);
                        return responseFun(500, err, "");
                    });
            } else if (response != null && response.msg == "作品不存在") {

                let trans_from_obj = {
                    t_status: 8, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = get_mysql(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp
                ).result;
                await exec_sql(sqlUp);
            } else {
                console.log("回调接口失败,", orderId);
                //
                let trans_from_obj = {
                    t_status: 8, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = get_mysql(
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
    console.log("betchCallFund All Done!");
    process.exit();
}

//TEST
betchCallFund1();

// node src\task\transTaskExec2.js
