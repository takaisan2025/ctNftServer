// SPDX-License-Identifier: BUSL-1.1
"use strict";const express = require("express");
const {createServer} = require("http");
const redisClient = require('./redis/redis')
const accountRoutes = require("./routers/account");
const createContractRoutes = require("./routers/createContract");
const mintRoutes = require("./routers/mint");
const transferRoutes = require("./routers/transfer");
const queryRouters = require("./routers/query");
const formidableMiddleware = require('express-formidable');
//处理post请求,解析json数据
const createHttpServer = (socketServer) => {
    const expressApp = express();
    const server = createServer(expressApp);

    expressApp.all("*", function (req, res, next) {
        req.headers["content-type"] = "application/json"; //  解决 application/json; charset=utf-8;
        next();
    });
    // 解析 application/json
    // create application/json parser
    //   expressApp.use(bodyParser.json());
    expressApp.use(express.json());
    // 使用body-parser中间件解析请求主体
    expressApp.use(express.urlencoded({extended: false}));
    // formdata
    // expressApp.use(formidableMiddleware());
    // Log Requests
    expressApp.use((req, res, next) => {
        // console.log(req.method, req.url, req.body, req.headers.origin);
        next();
    });
    expressApp.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept, X_BPI_CONTEXT"
        );
        res.header("Content-Type", "application/json");
        next();
    });
    // Register routes
    server.on("upgrade", (request, socket, head) => {
        socketServer.handleUpgrade(request, socket, head, (ws) => {
            socketServer.emit("connection", ws, request);
        });
    });

    accountRoutes(expressApp);
    createContractRoutes(expressApp);
    mintRoutes(expressApp);
    transferRoutes(expressApp);
    queryRouters(expressApp);

// 所有路由定义完之后，最后做404处理 /
    expressApp.get('*', function (req, res) {
        console.log('404 handler..')
        return res.status(404).json({code: 404, message: '接口不存在!'});
    });
    expressApp.post("*", async (req, res, next) => {
        console.log('404 handler..')
        return res.status(404).json({code: 404, message: '接口不存在!'});
    });

    expressApp.listen = (...args) => server.listen(...args);

    return expressApp;
};
module.exports = {
    createHttpServer,
};
