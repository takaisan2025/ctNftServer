const {testTransfer} = require("./task/testTask");

async function start() {
    console.log('testBackground.ts: Starting')
    setInterval(testTransfer, 2000)
}

start()
