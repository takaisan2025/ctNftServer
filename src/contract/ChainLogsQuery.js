const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
const ethers = require("ethers");
let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
let CtTransferExecutorAddress = GlobalConfig.CtTransferExecutorAddress;
const CtTransferExecutorABI = CtTransferExecutor.abi;
const contract = new ethers.Contract(CtTransferExecutorAddress, CtTransferExecutorABI, customHttpProvider);

//  进行日志查询
async function getTransferLogs(orderId) {

    // let topic = ethers.utils.id(
    //     "Transfer(bytes4 assetClass,address token,address from,address to,uint256 tokenId,uint256 indexed orderId,uint256 value,bytes4 transferDirection,bytes4 transferType)"
    // );
    let topic = "0xecdb8482f9f0e0660d31e60a051afdc7b9aa78546470590c62c264172368d0a7";
    let topic1 = `0x${ethUtil
        .keccak256(Buffer.from(orderId))
        .toString("hex")}`;
    ;
    //计算起始区块
    let filter = {
        address: CtTransferExecutorAddress,
        fromBlock: 0,   // 1天的数据
        toBlock: 100000000,  // 1 亿
        topics: [topic, topic1],
    };
    return await customHttpProvider.getLogs(filter).then((result) => {
        if (result != null && result.length != 0) {
            const parsedData = contract.interface.parseLog(result[0]);
            const functionName = parsedData.name; // 函数名
            const functionArgs = parsedData.args; // 参数列表

            // console.log('函数名:', functionName);
            // console.log('参数列表:', functionArgs);
            let transfer = {}
            transfer.assetClass = functionArgs.assetClass
            transfer.token = functionArgs.token
            transfer.from = functionArgs.from
            transfer.to = functionArgs.to
            transfer.tokenId = functionArgs.tokenId.toString()
            transfer.orderIdEc = functionArgs.orderId.toString()
            transfer.orderId = orderId
            transfer.value = Web3.utils.hexToNumberString(functionArgs.value)
            transfer.transferDirection = functionArgs.transferDirection
            transfer.transferType = functionArgs.transferType
            return {
                err: null,
                result: {...result[0], ...transfer}
            };
        } else {
            return {
                err: "not found: getTransferLogs",
                result: {}
            };
        }

    });
}

async function main() {
    let a = await getTransferLogs("16975279852702")
    console.log(a)
}

main()
module.exports = {
    getTransferLogs
};
