const {getCustomHttpProvider} = require("./taskConst");
const {getWeb3} = require("../task/taskConst");

let hashes = [
    "0x9320cb8752f4b1c3710c4bdf0480267792957dba82c80cd3a0b823882b113a69",
    "0x77db8dbd7f8fb2107058121908f73b0486a10261e9fe5f40c3af924e760a858b",
    "0x88a6f4e9b6a5f07ae6ec11ad2ac6cb74bd0d97779cfa19aaefa5bde017934fea",]

async function getReceipts() {

    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    for (let i = 0; i < hashes.length; i++) {
        let result = await getCustomHttpProvider().getTransactionReceipt(hashes[i]);
        console.log(result)
    }

}


async function getReceiptsBatch(hashes) {
    let _web3 = getWeb3()
    const batch = new _web3.BatchRequest();
    const promises = hashes.map(hash =>
        new Promise((resolve, reject) => {
            batch.add(_web3.eth.getTransactionReceipt.request(hash, (err, receipt) => {
                if (err) reject(err);
                else resolve({hash, receipt});
            }));
        })
    );
    batch.execute();
    return Promise.all(promises);
}

async function testTransfer() {

    console.time("test for query")
    //
    // // await getReceipts()
    const results = await getReceiptsBatch(hashes);
    console.log(results)
    console.log(results.length)
    results.forEach(({hash, receipt}, idx) => {
        if (!receipt) return;
        let t_statusStorage = receipt.status ? 6 : 1;
        console.log(receipt.status, idx)
        console.log(idx)
    });

    console.timeEnd("test for query")

}

testTransfer()
module.exports = {
    testTransfer
};
