"use strict";const {exec, escape} = require("../db/mysqlPool");
const xss = require("xss");
const pino = require("pino");
// const expressPino = require('express-pino-logger');
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const responseFun = (code, message, result) => {
    if (message == null || message == "") {
        message = "null";
    }
    return {
        code: code,
        message: message,
        result: result,
    };
};

const responseFunStr = (code, message, result) => {
    if (message == null || message == "") {
        message = {
            message: "null",
        };
    }
    return JSON.stringify(responseFun(code,
        message,
        result));
};
module.exports = {
    responseFun,
    responseFunStr,
};
