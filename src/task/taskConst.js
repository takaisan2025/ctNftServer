const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
const ethers = require("ethers");
const ethUtil = require("ethereumjs-util");

const customHttpProvider = new ethers.providers.JsonRpcProvider(GlobalConfig.BLOCK_CHAIN.RPC_URL[1].url);

function id_fun(str) {
    return `0x${ethUtil
        .keccak256(Buffer.from(str))
        .toString("hex")
        .substring(0, 8)}`;
}
const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const Web3 = require("web3");
let web3 = new Web3(
    new Web3.providers.HttpProvider(rpc.url, {
        headers: rpc.headers
    })
);
function formatTime(date) {
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear();
    let month =
        date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
    let minute =
        date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
    let second =
        date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = {
    customHttpProvider,
    id_fun,
    TRANSACTION_RECEIPT_STATUS,
    web3,
    formatTime
};
