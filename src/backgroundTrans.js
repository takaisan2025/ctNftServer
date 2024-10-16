"use strict";const {betchCallByTime} = require("./task/transTaskReCallByTime");
const {SubmitTransactionTask, TransactionHashQueryTask} = require("./task/submitTransactionTask");
const {betchCallFund1} = require("./task/transTaskReCall1");
const {betchCallFund} = require("./task/transTaskReCall");
const {betchHashQuery} = require("./task/transTaskHashQuery");
const {betchTransfer} = require("./task/transTask");
const {
    tFeeBetchTransfer,
    tFeeBetchHashQuery
} = require('./task/transFeeTask');

const {
    mintFileUploadIpfs,
    mintBetchMint,
    mintBetchHashQuery,
    mintBetchCallFund
} = require('./task/mintTask');
const {guijiTask} = require("./task/guijiTask");

async function testTime() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

async function start() {
    setInterval(betchTransfer, 5000)

}

start()
