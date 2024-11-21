const {delTransfer} = require("./task/delTransferTask");

async function start() {
    setInterval(delTransfer, 2000)
}

start()
