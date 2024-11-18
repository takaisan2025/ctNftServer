const {getCustomHttpProvider} = require("./taskConst");

async function testTransfer() {

    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    // if (GlobalConfig.CAN_AUTH) {
    console.log("customHttpProvider136:", getCustomHttpProvider().connection)
    console.log("customHttpProvider136:", getCustomHttpProvider().connection)
}

// betchTransfer();
module.exports = {
    testTransfer
};
