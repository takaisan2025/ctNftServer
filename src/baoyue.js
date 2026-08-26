const {baoyueTransfer} = require("./task/baoyueTask");

async function start() {
    console.log('baoyueTransfer.ts: Starting')
    setInterval(baoyueTransfer, 60000)
}

start()
