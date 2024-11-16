const {guijiTask} = require("./task/guijiTask");

async function start() {
    console.log('background.ts: Starting')
    console.log('background.ts: Run checks')
    console.log('background.ts: Run startup')
    console.log('background.ts: Starting Update Functions')
    setInterval(guijiTask, 20000)
}

start()
