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

const betchCallFundFlag = "betchCallFund_START";

async function betchCallFund() {
    if (await getString(betchCallFundFlag) == "1") {
        console.log('===================wait start betchCallFund')
        return
    } else {
        await setString(betchCallFundFlag, "1", 60)
        console.time("betchCallFund")
        // 设置列表
        var sql
        var params;
        params = {t_status: 6};
        sql = get_mysql(
            "trans_form_list",
            "selectByStatus",
            params
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
                    timeout: 5000
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
        await removeString(betchCallFundFlag)
        console.timeEnd("betchCallFund");
    }
}

module.exports = {
    betchCallFund
};
