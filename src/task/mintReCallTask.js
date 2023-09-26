const {
    nftUpdateSelectiveStatus,
    nftSelectSelectiveStatus,
} = require("../controller/ctnft");
const FormData = require("form-data");
const fetch = require("node-fetch");
let reCallUrlChanel1 = "http://nft.richonn.com/home/nft/casting";

const {responseFunStr} = require("../mapper/account");

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
async function mintBetchCallFund() {
    console.time('mintBetchCallFund')
    let nfts = nftSelectSelectiveStatus(7); // 上链成功  没有回调的
    let nftArr = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.trace(responseFunStr(500, err, {}));
        });
    for (let retKey in nftArr) {
        try {
            let {tokenId, update_time, hash, rebackUrl} = nftArr[retKey];
            var formdata = new FormData();
            formdata.append("key", "qianyidata");
            // console.log(tokenId)
            formdata.append("tokenId", tokenId);
            formdata.append("mintDate", formatTime(update_time));
            formdata.append("status", "true");
            formdata.append("hash", hash);
            console.log("formatTime(update_time)", formatTime(update_time));
            var requestOptions = {
                method: "POST",
                body: formdata,
                redirect: "follow",
            };

            if (rebackUrl == "" || rebackUrl == null || rebackUrl == undefined || rebackUrl == reCallUrlChanel1) {
                let responseChanel1 = await fetch(reCallUrlChanel1, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        key: "qianyidata",
                        tokenId: tokenId,
                        mintDate: formatTime(update_time),
                        status: true,
                        hash: hash,
                    }),
                })
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
                        console.trace("回调错误:", err, ",tokenId", tokenId);
                        return {data: null, err: err};
                    });
                //处理响应结果
                console.log(responseChanel1);
                if (responseChanel1.data == null) {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                } else if (responseChanel1.data.code == 200) {
                    await nftUpdateSelectiveStatus(1, tokenId); // 设置为回调成功状态
                } else {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                }
            } else {
                let responseRet = await fetch(rebackUrl, requestOptions)
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
                        console.trace("回调错误:", err, ",tokenId", tokenId);
                        return {data: null, err: err};
                    });
                //处理响应结果
                let response = responseRet.data;
                console.log(response);
                if (response == null) {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                } else if (response.status && response.status == 1) {
                    await nftUpdateSelectiveStatus(1, tokenId); // 设置为回调成功状态
                } else {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                }
            }
        } catch (e) {
            console.trace(e);
            continue;
        }
    }
    console.timeEnd('mintBetchCallFund')
}

function formatTime(date) {
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear();
    let month =
        date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
    let minute =
        date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
    let second =
        date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

mintBetchCallFund();
module.exports = {
    mintBetchCallFund
};
// node src\task\mintReCallTask.js
