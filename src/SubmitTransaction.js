"use strict";
const {SubmitTransactionTask} = require("./task/submitTransactionTask");

async function testTime() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

async function start() {
    console.log('SubmitTransactionTask.ts: Starting')
    // auth
    setInterval(SubmitTransactionTask, 5000)
    // setInterval(guijiTask, 20000)
    // setInterval(TransactionHashQueryTask, 5000)
}

start()
