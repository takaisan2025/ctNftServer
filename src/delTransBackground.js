const {delTransfer} = require("./task/delTransferTask");

async function start() {
    setInterval(delTransfer, 5000)
}

start()
