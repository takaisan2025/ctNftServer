const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
const {RESPONSE_STATUS} = require("../chain/responseError");
const GlobalConfig = require("../config/GlobalConfig.json");

const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");

const EIP712 = require("../router/EIP712");
const ABI_const = require("../contract/ABI_const.js");
const ethers = require("ethers");
const {responseFun, responseFunStr} = require("../mapper/account");
const {getPriKey} = require("../chain/accountProUtils");
const {PasswordError} = require("../chain/responseError");
const {exec_sql, exec_sql_all} = require("../controller/ctnft");
const {get_mysql} = require("../db/genSql");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider(
    {
        ...rpc,
    },
    {
        chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
    }
);

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function betchPreaprAuth() {
    let nfts_sql_ret = get_mysql("AccountMapper", "selectByAddress", {
        address: "0x0A66f4161917454947C08b3024ABeaD58A0012CC",
    }); // 资源未上链ipfs的条目
    let nfts_sql = nfts_sql_ret.result;
    let nfts_ret = await exec_sql(nfts_sql);
    let accountArr = [];
    if (nfts_ret.err != null) {
        console.trace(responseFunStr(500, nfts_ret.err, {}));
    } else {
        accountArr = nfts_ret.result;
    }

    // console.log(ret[retKey]);
    try {
        const {
            address
        } = accountArr;

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
            console.log(c_decWalletResult.err)
        } else {
            c_wallet = c_decWalletResult.result;

            // 判断商家身份
            let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
            // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
            //等待其它程序处理上链
            let sender = AUTH_CONTROLLER_SYSTEM_ADDRESS;
            let authTime = 1766841499; // 没有用的参数
            let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
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
            let nft_transaction_aql = get_mysql(
                "NftTransactionMapper",
                "insertSelective",
                {
                    from: AUTH_CONTROLLER_SYSTEM_ADDRESS,
                    to: contractAddress,
                    status: 0,
                    // "hash": "",
                    // "block_number": "",
                    type: 1,
                    is_reback: 0,
                    order_id: orderId,
                    value: "0",
                    // "origin_data": JSON.stringify(origin_data_json),
                    origin_data: origin_data_json,
                    contract_address: contractAddress,
                    method:
                        ABI_const["AuthController"].contractName +
                        "#" +
                        "authentication",
                    origin_value: "0",
                }
            );
            let nft_transaction_aql_result = await exec_sql(
                nft_transaction_aql.result
            );
            if (nft_transaction_aql_result.err != null) {
                if (nft_transaction_aql_result.err == "ER_DUP_ENTRY") {
                    return responseFun(500, "OrderId 冲突!", {});
                } else {
                    return responseFun(500, "操作失败,请重试!", {});
                }
            }
            console.log(responseFun(RESPONSE_STATUS.SUCCESS, "请求成功", {
                s_address: AUTH_CONTROLLER_SYSTEM_ADDRESS,
                address: address,
                orderId: orderId,
            }))
        }

        console.log("操作成功!", {address: address})

    } catch (e) {
        console.trace(e);
    }
    console.log("betchPreaprAuth All Done!");

}


betchPreaprAuth();

// node src\task\accountPreparAuth.js
