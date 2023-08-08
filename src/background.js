const {
    mintBetchCallFund
} = require('./task/mintReCallTask');
const {
    tFeeBetchTransfer,
    tFeeBetchHashQuery
} = require('./task/transFeeTask');

const {
    mintFileUploadIpfs,
    mintBetchMint,
    mintBetchHashQuery
} = require('./task/mintTask');

async function deleteOldOrders() {
    console.time('deleteOldOrders')
    console.timeEnd('deleteOldOrders')
}

/* ################ V3 functions  ################ */

async function updateVolumes() {
    console.time('updateVolumes')
    console.timeEnd('updateVolumes')
}

async function start() {
    console.log('background.ts: Starting')
    console.log('background.ts: Run checks')
    console.log('background.ts: Run startup')
    console.log('background.ts: Starting Update Functions')
    // mint
    setInterval(mintFileUploadIpfs, 30000)
    setInterval(mintBetchMint, 3000)
    setInterval(mintBetchHashQuery, 3000)
    setInterval(mintBetchCallFund, 3000)
    // transfer
``
    // fee
    setInterval(tFeeBetchTransfer, 3000)
    setInterval(tFeeBetchHashQuery, 3000)
}

start()
