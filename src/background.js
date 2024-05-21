const {betchCallByTime} = require("./task/transTaskReCallByTime");
const {SubmitTransactionTask} = require("./task/submitTransactionTask");
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

async function testTime() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

async function start() {
    console.log('background.ts: Starting')
    console.log('background.ts: Run checks')
    console.log('background.ts: Run startup')
    console.log('background.ts: Starting Update Functions')
    // mint
    setInterval(mintFileUploadIpfs, 2000)
    setInterval(mintBetchMint, 5000)
    setInterval(mintBetchHashQuery, 5000)
    setInterval(mintBetchCallFund, 2000)
    // // transfer
    setInterval(betchTransfer, 5000)
    setInterval(betchHashQuery, 5000)
    setInterval(betchCallFund, 2000)
    setInterval(betchCallFund1, 30000)
    setInterval(betchCallByTime, 30000)
    //
    // // fee
    setInterval(tFeeBetchTransfer, 5000)
    setInterval(tFeeBetchHashQuery, 5000)

    // auth
    setInterval(SubmitTransactionTask, 5000)
}

start()
