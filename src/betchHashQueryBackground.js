const {betchHashQuery} = require("./task/transTaskHashQuery");
const {mintBetchHashQuery} = require("./task/mintTask");
const {TransactionHashQueryTask} = require("./task/submitTransactionTask");

async function start() {
    console.log('background.ts: Starting')
    console.log('background.ts: Run checks')
    console.log('background.ts: Run startup')
    console.log('background.ts: Starting Update Functions')
    setInterval(betchHashQuery, 1000)
    setInterval(mintBetchHashQuery, 1000)
    setInterval(TransactionHashQueryTask, 1000)
}

start()
