"use strict";
const {mintBetchMint} = require("./task/mintTask");

async function testTime() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

async function start() {
    console.log('mintBetchMint.ts: Starting')
    // auth
    setInterval(mintBetchMint, 5000)
    // setInterval(guijiTask, 20000)
    // setInterval(TransactionHashQueryTask, 5000)
}

start()
