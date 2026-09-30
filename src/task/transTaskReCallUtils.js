const FormData = require("form-data");
const fetch = require("node-fetch");
const {formatTime} = require("./taskConst");
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const {updateTransFormList, findTransFormListAll} = require("../Orm/TransFormListService");

async function betchCallFundUtils(name, endStatus, queryName, queryParams) {
    const betchCallFundFlag = name + "_START";
    if (await getString(betchCallFundFlag) == "1") {
        console.log('===================wait start ' + name)
        return
    } else {
        await setString(betchCallFundFlag, "1", 60)
        console.time(name)
        // 设置列表

        let transList_ret = await findTransFormListAll(_param = {
            where: queryParams,
            offset: 0,
            limit: 100,
        })

        // console.log("betchTransferThread", sql)
        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.result);
        }
        transList = transList_ret.result;
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
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${formdata.getBoundary()}`
                },
                timeout: 5000
            };
            urls.push({url: reback_url, requestOptions: requestOptions, orderId: orderId, id: id});

        }
        try {

            const results = await Promise.allSettled(urls.map(async url => {

                    if (url.url.indexOf("chaonft.cn/") !== -1) {
                        console.log("The string contains 'chaonft.cn/'.");
                        let responseRet = {data: null, err: "The string contains 'chaonft.cn/'.", ori_data: url};

                        console.log("回调接口失败,", responseRet.ori_data.orderId);
                        let trans_from_obj = {
                            t_status: 21, // 永不回调
                        }
                        await updateTransFormList(trans_from_obj, {id: responseRet.ori_data.id})
                    } else {
                        console.log("The string does not contain 'chaonft.cn/'.");
                        await fetch(url.url, url.requestOptions)
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
                                    };
                                    await updateTransFormList(query_params, {id: responseRet.ori_data.id})
                                } else if (response != null && response.msg == "作品不存在") {

                                    let query_params = {
                                        t_status: endStatus, // 上链成功
                                    };
                                    await updateTransFormList(query_params, {id: responseRet.ori_data.id})
                                } else {
                                    console.trace("回调错误:", response, ",orderId", url.orderId);
                                    console.log("回调接口失败,", responseRet.ori_data.orderId);
                                    //
                                    let query_params = {
                                        t_status: endStatus, // 上链成功
                                        vm_err: JSON.stringify(response),
                                    };
                                    await updateTransFormList(query_params, {id: responseRet.ori_data.id})
                                }
                            })
                            .catch(async (err) => {
                                console.trace(err)
                                console.trace("回调错误:", err, ",orderId", url.orderId);
                                // return {data: null, err: err, ori_data: url};

                                let responseRet = {data: null, err: err, ori_data: url};

                                console.log("回调接口失败,", responseRet.ori_data.orderId);
                                //
                                let query_params = {
                                    t_status: endStatus, // 回调失败
                                    vm_error: JSON.stringify(err),
                                };
                                await updateTransFormList(query_params, {id: responseRet.ori_data.id})
                            })
                    }
                }
            ));
            for (const result of results) {
                if (result.status === "rejected") console.trace(result.reason);
            }
        } catch (e) {
            console.trace(e)
        }

        await removeString(betchCallFundFlag)
        console.timeEnd(name);
    }
}

module.exports = {
    betchCallFundUtils
};
