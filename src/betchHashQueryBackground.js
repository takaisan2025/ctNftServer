const {betchHashQuery} = require("./task/transTaskHashQuery");

async function start() {
    console.log('background.ts: Starting')
    console.log('background.ts: Run checks')
    console.log('background.ts: Run startup')
    console.log('background.ts: Starting Update Functions')
    setInterval(betchHashQuery, 2000)
}

start()
