const {
    exec_sql,
    exec_sql_all
} = require("../controller/ctnft");
const FormData = require("form-data");
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

async function betchCallFundUtils(name, endStatus, queryName, queryParams) {
    const betchCallFundFlag = name + "_START";
    if (await getString(betchCallFundFlag) == "1") {
        console.log('===================wait start ' + name)
        return
    } else {
        await setString(betchCallFundFlag, "1", 60)
        console.time(name)
        // 设置列表
        let sql
        sql = get_mysql(
            "trans_form_list",
            queryName,
            queryParams
        ).result;

        sql = sql.replace("! =", "!=")
        // console.log("betchTransferThread", sql)
        let transList_ret = await exec_sql_all(sql)
        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.err);
            return
        }
        transList = transList_ret.result

        let urls = [];

        for (let retKey in transList) {
            let {
                token_id,
                id,
                hash,
                update_time,
                orderId,
                reback_url
            } = transList[retKey];

            if (reback_url == "" || reback_url == null) {
                continue;
            }

            let formdata = new FormData();
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
            const requestOptions = {
                method: "POST",
                body: formdata,
                redirect: "follow",
                timeout: 5000
            };
            urls.push({url: reback_url, requestOptions: requestOptions, orderId: orderId, id: id});

        }
        try {

            Promise.all(urls.map(url =>
                fetch(url.url, url.requestOptions)
                    .then(responseData => {
                        console.log("回调返回原始内容status:", responseData.status);
                        console.log("回调返回原始内容statusText:", responseData.statusText);
                        return responseData.json()
                    })
                    .then(async responseData => {
                        console.log("回调返回处理结果:", responseData);
                        // return {data: response, err: null, ori_data: url};

                        let responseRet = {data: responseData, err: null, ori_data: url};
                        //处理响应结果
                        console.log("responseRet", responseRet)
                        let response = responseData
                        //处理响应结果
                        console.log("response", response);
                        if (response != null && (response.status == 1 || response.status == 200)) {

                            let query_params = {
                                t_status: 4, // 上链成功
                                id: responseRet.ori_data.id
                            };
                            console.log("nftUpdateSelective:", query_params);

                            let sqlUp = get_mysql(
                                "trans_form_list",
                                "updateByPrimaryKeySelective",
                                query_params
                            ).result;
                            await exec_sql(sqlUp)
                                .then((ret) => {
                                    return ret;
                                })
                                .catch((err) => {
                                    console.trace(responseFun(500, err, ""), responseRet.ori_data.id);
                                    return responseFun(500, err, "");
                                });
                        } else if (response != null && response.msg == "作品不存在") {

                            let query_params = {
                                t_status: endStatus, // 上链成功
                                id: responseRet.ori_data.id
                            };
                            console.log("nftUpdateSelective:", query_params);

                            let sqlUp = get_mysql(
                                "trans_form_list",
                                "updateByPrimaryKeySelective",
                                query_params
                            ).result;
                            await exec_sql(sqlUp);
                        } else {
                            console.trace("回调错误:", response, ",orderId", url.orderId);
                            // return {data: null, err: err, ori_data: url};

                            console.log("回调接口失败,", responseRet.ori_data.orderId);
                            //
                            let query_params = {
                                t_status: endStatus, // 上链成功
                                id: responseRet.ori_data.id
                            };
                            console.log("nftUpdateSelective:", query_params);

                            let sqlUp = get_mysql(
                                "trans_form_list",
                                "updateByPrimaryKeySelective",
                                query_params
                            ).result;
                            await exec_sql(sqlUp);
                        }
                    })
                    .catch(async (err) => {
                        console.trace("回调错误:", err, ",orderId", url.orderId);
                        // return {data: null, err: err, ori_data: url};

                        let responseRet = {data: null, err: err, ori_data: url};

                        console.log("回调接口失败,", responseRet.ori_data.orderId);
                        //
                        let query_params = {
                            t_status: endStatus, // 回调失败
                            id: responseRet.ori_data.id
                        };
                        console.log("nftUpdateSelective:", query_params);

                        let sqlUp = get_mysql(
                            "trans_form_list",
                            "updateByPrimaryKeySelective",
                            query_params
                        ).result;
                        await exec_sql(sqlUp);

                    })
            )).then(async responseRet => {
                // console.log(responseRet)
            });
        } catch (e) {
            console.error(e)
            console.trace(e)
        }

        await removeString(betchCallFundFlag)
        console.timeEnd(name);
    }
}

module.exports = {
    betchCallFundUtils
};
