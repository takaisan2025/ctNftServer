const {
    writeFile,
    readFile
} = require("../file/fileWriteReadUtils");
const fetch = require("node-fetch");
const {
    execSql,
    execSqlAll
} = require("../db/mysqlPoolPhp");
const GlobalConfig = require("../config/GlobalConfig.json");
const scoreTokenAddress = "0xefb454e89efff1e734432060e34d536dfa8eed65";
const ethers = require("ethers");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let blockNumberCreate = 1090551;   // 合约的创建区块号
let blockNumberCurr = 0;   // 当前最新区块号
let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

let startBlockNumber = 0;

async function betGetHistory(fromBlock, toBlock) {
    let topic = ethers.utils.id(
        "Transfer(address,address,uint256)"
    );

    let url = `https://ctblock.cn/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${scoreTokenAddress}&topic0=${topic}`
    let response = await fetch(url, {})
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log("Call Faild  reCall:", err);
        });
    // console.log("response:", response);

    return response;
}

async function processResult(result) {
    var format = {language: "sql", indent: "  "};
    for (let resultKey in result.result) {
        let tempObj = result.result[resultKey];
        // console.log(tempObj);
        if (!tempObj.removed) {  // 非失败交易
            let value = ethers.utils.defaultAbiCoder.decode([
                "uint256"], tempObj.data).toString();
            let from = ethers.utils.defaultAbiCoder.decode([
                "address"], tempObj.topics[1])[0];
            let to = ethers.utils.defaultAbiCoder.decode([
                "address"], tempObj.topics[2])[0];
            let blockNumber = tempObj.blockNumber;
            let transactionHash = tempObj.transactionHash;
            console.log(from, to, value, transactionHash, blockNumber);
            if (from.toString().toLowerCase() != scoreTokenAddress && from.toString().toLowerCase() != to.toString().toLowerCase()) {  // 转增交易, 存入数据库
                console.log(from, to, value, blockNumber, transactionHash);

            }
        }
    }

    console.log("betcGetHistory All Done!");
}

async function main() {
    // let response = await betGetHistory(0, 1895565);
    // console.log(response);

    let data = "0x00000000000000000000000000000000000000000000000000000000000004d20000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000162e0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000";
// [
//   { BigNumber: "1234" },
//   [
//     { BigNumber: "5678" },
//     'Hello World'
//   ]
// ]

// Decoding complex structs; named parameters allows positional
// or keyword access to values
    let v = ethers.utils.defaultAbiCoder.decode(["uint a", "tuple(uint256 b, string c) d"], data);
    console.log(v)
}

main()
// node src/task/mintHashFlHistory.js
