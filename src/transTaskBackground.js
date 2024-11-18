const {betchTransfer} = require("./task/transTask");

async function start() {
    setInterval(betchTransfer, 3000)
}

start()
