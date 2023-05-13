const {
    writeFile,
    readFile
} = require("../file/fileWriteReadUtils");
const fetch = require("node-fetch");
const {
    exec_sql,
    exec_sql_all
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

    let data = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002e516d5a6350587573696834704457573836614245397059635948464c577a4d61415a7038454c74704c764c327469000000000000000000000000000000000000";
// [
//   { BigNumber: "1234" },
//   [
//     { BigNumber: "5678" },
//     'Hello World'
//   ]
// ]

// Decoding complex structs; named parameters allows positional
// or keyword access to values
    let v = ethers.utils.defaultAbiCoder.decode(["string"], data);
    console.log(v)
}

const Web3 = require("web3");

function main1() {
    const address1 = '0x1234567890123456789012345678901234567890';
    const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const address3 = '0xbbcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const address4 = '0xbbcdefabcdefabcdefabcdefabcdefabcdefabc1';
    const address5 = '0xbbcdefabcdefabcdefabcdefabcdefabcdefabc2';

    const addresses = [address1, address2, address3, address4, address5];

    addresses.sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase()) {
            return -1;
        }
        if (a.toLowerCase() > b.toLowerCase()) {
            return 1;
        }
        return 0;
    });

    console.log(addresses);
}

const web3 = new Web3();

function main2() {
    let rootHashOx = "0x3975b76e36bc4e346b86f22f22523595"

// 定义输入参数
    const _from = '0x5216964c075426651b949c6d9c2d7682c5bd81dd';
    const _to = '0x6331384fd95eedc4c5ce96d4bdfe14d7fc365554';

    let env = web3.eth.abi.encodeParameters(['address', 'address'], [_from, _to])

    console.log(env)
// 计算keccak256散列
    const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(['address', 'address'], [_from, _to]));
    // const hash = web3.utils.keccak256("0x5216964c075426651b949c6d9c2d7682c5bd81dd6331384fd95eedc4c5ce96d4bdfe14d7fc365554");
    console.log(hash);  //0x0e11fc7ad4191b6de8b9a13638fd17c99e0cb510c03c7ca71c05adac61b5f106
}

// main()
// main1()
main2()
// node src/task/mintHashFlHistory.js
