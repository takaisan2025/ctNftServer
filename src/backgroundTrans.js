const {betchTransfer} = require("./task/transTask");

async function start() {
    setInterval(betchTransfer, 30000)
}

start()
