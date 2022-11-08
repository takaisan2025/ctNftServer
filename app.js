let dotenv = require('dotenv');
dotenv.config('./env');
const requestIp = require('request-ip');
const queryString = require("querystring");
const handleUserRouter = require("./src/router/user");
const responseFun = (code, err, result) => {
    if (err == null || err == "") {
        err = {
            message: "null"
        }
    }
    return {
        code: code,
        message: err.message,
        result: result,
    };
};

const getPostData = (req) => {
    return new Promise((resolve, reject) => {
        if (req.method !== "POST") {
            resolve({});
            return;
        }

        if (!req.headers["content-type"] || req.headers["content-type"].indexOf("application/json") == -1) {
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
        console.error({message: "request denied!"})
        res.end(JSON.stringify(responseFun(403, {message: "request denied!"}, "")));
        return;

    } else {
        // 设置返回格式JSON
        res.setHeader("Content-type", "application/json");
        const url = req.url;
        req.path = url.split("?")[0];

        console.log("req.method:", req.method, ";req.path:", req.path, ";clientIp:", clientIp);
        // 解析query
        req.query = queryString.parse(url.split("?")[1]);

        // 如果想要查看一下请求头都包含哪些信息，可以log一下header

        getPostData(req).then(async (postData) => {
            if (req.path.indexOf('private') == -1 && JSON.stringify(postData) === '{}') {
                console.log(JSON.stringify(responseFun(400, {message: "参数错误"}, "")));
                res.end(JSON.stringify(responseFun(400, {message: "参数错误"}, "")));
                return;
            }
            req.body = postData;
            // console.log("req.body:", req.body)
            // console.log("OVER!");
            try {
                const response = await handleUserRouter(req, res);
                if (response) {
                    res.end(JSON.stringify(response));
                    return;
                }

            } catch (e) {
                console.trace(e)
                if (e.message) {
                    res.end(JSON.stringify(e));
                } else {
                    res.end(JSON.stringify(responseFun(500, {message: "process error!"}, "")));
                }
                return;
            }

            // 未命中路由
            res.writeHead(404, {"Content-type": "text/plain"});
            res.write("404 Not Found ~\n");
            res.end();
        });
    }


};

module.exports = severHandle;
