const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
const {RESPONSE_STATUS} = require("../chain/responseError");
const GlobalConfig = require("../config/GlobalConfig.json");

const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");

const EIP712 = require("../routers/EIP712");
const ABI_const = require("../contract/ABI_const.js");
const {responseFun, responseFunStr} = require("../mapper/account");
const {getPriKey} = require("../chain/accountProUtils");
const {PasswordError} = require("../chain/responseError");
const {findAccount, createAccount} = require("../Orm/AccountService");
const {createNftTransaction} = require("../Orm/NftTransactionService");

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function betchPreaprAuth(authAddress) {

    let nfts_ret = await findAccount(_where = {address: authAddress})

    let accountArr = [];
    if (nfts_ret.code !== 0) {
        console.trace(responseFunStr(500, nfts_ret.err, {}));
    } else {
        accountArr = nfts_ret.result[0].toJSON();
    }
    try {
        let orderId = new Date().getTime();
        // 计算签名
        let orderIdEcc = `0x${ethUtil
            .keccak256(Buffer.from(orderId + ""))
            .toString("hex")}`;

        // 判断接入方用户名密码
        let AUTH_CONTROLLER_SYSTEM_ADDRESS = GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS // TODO 这里需要系统地址

        // 判断用户密码是否正确
        // 判断接入方用户名密码

        let c_decWalletResult = await getPriKey(accountArr, accountArr.psd);
        let c_wallet;
        if (c_decWalletResult.err != null) {
            console.trace(PasswordError)
        } else {
            c_wallet = c_decWalletResult.result;

            // 判断商家身份
            let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
            //等待其它程序处理上链
            let sender = AUTH_CONTROLLER_SYSTEM_ADDRESS;
            let authTime = 1766841499; // 没有用的参数
            let authExpiry = Math.round(new Date().getTime() / 1000) + 1 * 60 * 60 * 24 * 3600; // 六个月
            let isAuth = true;
            let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
            let expandData = '{hash: \\"\\", version: \\"v1.0.0\\"}';
            console.log(expandData)
            let caddress = c_wallet.address;
            // 计算签名
            let auth = {
                caddress,
                sender,
                authTime,
                authExpiry,
                isAuth,
                authLevel,
                expandData,
            };

            let privateKeyStr = c_wallet.privateKey;
            let verifyingContract = contractAddress;
            privateKeyStr = web3.utils.stripHexPrefix(privateKeyStr);

            const privateKey = Buffer.from(privateKeyStr, "hex");

            // uint256 orderId,
            // address caddress,
            // address sender,
            // bool isAuth,
            // string expandData

            const Types = {
                Authentication: [
                    {type: "uint256", name: "orderId"},
                    {type: "address", name: "caddress"},
                    {type: "address", name: "sender"},
                    {type: "bool", name: "isAuth"},
                ],
            };

            const data = EIP712.createTypeData(
                {
                    name: "Authentication",
                    version: "1",
                    chainId: "27",
                    verifyingContract,
                },
                "Authentication",
                {
                    orderId: orderIdEcc,
                    caddress: auth.caddress,
                    sender: auth.sender,
                    isAuth: auth.isAuth,
                },
                Types
            );

            let signature = sigUtil.signTypedData_v4(privateKey, {data: data});
            auth.signature = signature;

            let origin_data_json = [auth, orderIdEcc];
            // 存储上链数据
            // 插入数据库
            let nft_transaction = {
                from: AUTH_CONTROLLER_SYSTEM_ADDRESS,
                to: contractAddress,
                status: 0,
                // "hash": "",
                // "block_number": "",
                type: 1,
                is_reback: 0,
                order_id: orderId,
                value: "0",
                "origin_data": JSON.stringify(origin_data_json),
                // origin_data: origin_data_json,
                contract_address: contractAddress,
                method:
                    ABI_const["AuthController"].contractName +
                    "#" +
                    "authentication",
                // origin_value: `{"name":"张三","id":"110101200007286800","mobile":"16602190060"}`,
                origin_value: `0`,
            };

            let result02 = await createNftTransaction(_obj = nft_transaction)

            console.log(result02)
        }

        console.log("操作成功!", {address: orderId})

    } catch (e) {
        console.trace(e);
    }
    console.log("betchPreaprAuth All Done!");

}

betchPreaprAuth("0xFe6AcF30e5E1f8d05f47533bE66Fa1335074AFec");
// LOCAL
// betchPreaprAuth("0x1d517aa4a3a5f489b9cF5fD58A80C08F54Ad8fB6");

// node src\task\accountPreparAuth.js
// https://ctblock.cn/address/0x709bBc0aD7581D02244E00C356d0EFcbC79AE9f3/write-contract  // 添加白名单
