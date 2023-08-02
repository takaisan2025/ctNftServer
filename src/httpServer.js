// SPDX-License-Identifier: BUSL-1.1
const express = require("express");
const {createServer} = require("http");
const accountRoutes = require("./routers/account");

const createHttpServer = (socketServer) => {
    const expressApp = express();
    const server = createServer(expressApp);

    const httpMessages = [
        "requestquote",
        "submitorder",
        "submitorder2",
        "submitorder3",
        "orderreceiptreq",
        "dailyvolumereq",
        "refreshliquidity",
        "marketsreq",
        "cancelorder2",
    ];

// 解析 application/json
    expressApp.use(express.json());
// 解析 application/x-www-form-urlencoded
    expressApp.use(express.urlencoded());

    // CORS
    expressApp.use("/", (req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );
        res.header("Access-Control-Allow-Methods", "GET, POST");
        next();
    });

    // Log Requests
    expressApp.use((req, res, next) => {
        console.log(req.method, req.url, req.body, req.headers.origin);
        next();
    });

    // Register routes
    server.on("upgrade", (request, socket, head) => {
        socketServer.handleUpgrade(request, socket, head, (ws) => {
            socketServer.emit("connection", ws, request);
        });
    });

    accountRoutes(expressApp);

    expressApp.listen = (...args) => server.listen(...args);

    return expressApp;
};
module.exports = {
    createHttpServer,
};
