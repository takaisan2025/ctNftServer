const {betchTransfer} = require("./task/transTask");

async function start() {
    setInterval(betchTransfer, 5000)
}

start()
