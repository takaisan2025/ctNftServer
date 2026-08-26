"use strict";
const {mintBetchCallFund} = require("./task/mintTask");

async function testTime() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

async function start() {
    console.log('mintBetchCallFund.ts: Starting')
    // auth
    setInterval(mintBetchCallFund, 5000)
    // setInterval(guijiTask, 20000)
    // setInterval(TransactionHashQueryTask, 5000)
}

start()
