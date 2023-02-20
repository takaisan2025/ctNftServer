let dotenv = require("dotenv");
dotenv.config("./env");
const requestIp = require("request-ip");
const queryString = require("querystring");
const handleUserRouter = require("./src/router/user");
const {responseFunStr} = require("./src/mapper/account");
const pino = require("pino");
// const expressPino = require('express-pino-logger');
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
// const expressLogger = expressPino({ logger });

const getPostData = (req) => {
    return new Promise((resolve, reject) => {
        if (req.method !== "POST") {
            resolve({});
            return;
        }

        if (
            !req.headers["content-type"] ||
            req.headers["content-type"].indexOf("application/json") == -1
        ) {
            resolve({});
            return;
        }
        let postData = "";

        req.on("data", (chunk) => {
            if (req.headers["content-type"].indexOf("application/json") != -1) {
                return (postData += chunk.toString());
            } else {
                resolve({});
                return;
            }
        });
        req.on("end", () => {
            if (!postData) {
                resolve({});
                return;
            }
            try {
                // postData = postData.replace(/\\/g, "\\\\")
                resolve(JSON.parse(postData));
            } catch (err) {
                resolve({});
                return;
            }
        });
    });
};

// let iPBlackList = [
//     "::ffff:54.219.50.180",
//     "::ffff:192.168.5.102",
//     "::ffff:106.55.44.124",
// ];

const severHandle = (req, res) => {
    let iPBlackList = require("./src/config/iPBlackList.json");
    //日志打印
    // console.log("START!")
    const clientIp = requestIp.getClientIp(req);
    if (iPBlackList.includes(clientIp)) {
        console.error({info: "request denied!", clientIp: clientIp});
        res.end(responseFunStr(403, "request denied!", ""));
        return;
    } else {
        // 设置返回格式JSON
        res.setHeader("Content-type", "application/json");
        const url = req.url;
        req.path = url.split("?")[0];
        logger.info(
            "req:%s;:%s;clientIp:%s",
            req.method,
            req.path,
            clientIp
        );
        // console.log(
        //     "req.method:",
        //     req.method,
        //     ";req.path:",
        //     req.path,
        //     ";clientIp:",
        //     clientIp
        // );
        // 解析query
        req.query = queryString.parse(url.split("?")[1]);

        // 如果想要查看一下请求头都包含哪些信息，可以log一下header

        getPostData(req).then(async (postData) => {
            if (
                req.path.indexOf("private") == -1 &&
                JSON.stringify(postData) === "{}"
            ) {
                let resp = responseFunStr(400, "参数错误", "");
                console.log(resp);
                res.end(resp);
                return;
            }
            req.body = postData;
            // console.log("req.body:", req.body)
            // console.log("OVER!");
            try {
                if (req.method != "POST") {
                    res.writeHead(403, {"Content-type": "application/json"});
                    res.end(responseFunStr(403, "API unsupport GET!", ""));
                } else {
                    const response = await handleUserRouter(req, res);
                    if (response) {
                        res.end(JSON.stringify(response));
                        return;
                    }
                }

            } catch (e) {
                console.trace(e);
                if (e) {
                    res.end(JSON.stringify(e));
                } else {
                    res.end(responseFunStr(500, "process error!", ""));
                }
                return;
            }

            // 未命中路由
            res.writeHead(404, {"Content-type": "application/json"});
            res.write(responseFunStr(404, "Not found!", ""));
            res.end();
        });
    }
};

module.exports = severHandle;
