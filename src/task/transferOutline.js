const ethUtil = require("ethereumjs-util");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
const {createNftTransaction} = require("../Orm/NftTransactionService");
const {id_fun} = require("./taskConst");
const ethers = require("ethers");

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function transferOutline(tAddress, reward_amount) {

    // let reward_amount = '30';

    try {
        let orderIdOri = new Date().getTime();
        // 计算签名
        let orderIdEcc = `0x${ethUtil
            .keccak256(Buffer.from(orderIdOri + "_TRANSFER"))
            .toString("hex")}`;

        let contractAddress = GlobalConfig.CtTransferExecutorAddress;

        let assetClass = id_fun("ETH");
        let token = GlobalConfig.ZERO_ADDRESS;
        let from = GlobalConfig.FEE_ACCOUNT.address;
        let to = tAddress;
        let tokenId = GlobalConfig.ZERO_ADDRESS;
        let orderId = orderIdEcc;
        let value = reward_amount;
        let transferDirection = assetClass;
        let transferType = assetClass;
        let signature = assetClass


        //等待其它程序处理上链
        let origin_data_json = [
            assetClass,
            token,
            from,
            to,
            tokenId,
            orderId,
            ethers.utils.parseEther(value).toString(),
            transferDirection,
            transferType,
            signature];
        // 存储上链数据
        // 插入数据库
        let nft_transaction = {
            from: from,
            to: contractAddress,
            status: 0,
            // "hash": "",
            // "block_number": "",
            type: 1,
            is_reback: 0,
            order_id: orderIdOri + "_TRANSFER",
            value: value,
            "origin_data": JSON.stringify(origin_data_json),
            // origin_data: origin_data_json,
            contract_address: contractAddress,
            method:
                ABI_const["CtTransferExecutor"].contractName +
                "#" +
                "transfer",
            origin_value: `0`,
        };

        let result02 = await createNftTransaction(_obj = nft_transaction)

        console.log(result02)
        console.log("操作成功!", {address: tAddress})

    } catch (e) {
        console.trace(e);
    }

}

// transferOutline("0xFe6AcF30e5E1f8d05f47533bE66Fa1335074AFec", "30");
// LOCAL
// transferOutline("0x1d517aa4a3a5f489b9cF5fD58A80C08F54Ad8fB6");

// node src\task\accountPreparAuth.js
// https://ctblock.cn/address/0x709bBc0aD7581D02244E00C356d0EFcbC79AE9f3/write-contract  // 添加白名单
module.exports = {
    transferOutline
};
