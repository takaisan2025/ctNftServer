const {delTransfer} = require("./task/delTransferTask");

async function start() {
    setInterval(delTransfer, 1000)
}

start()
