const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const EIP712 = require("./EIP712");
const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
const {
    nftSelectSelective,
    exec_sql,
    nftSelectSelectiveCreator,
    nftInsertSelective,
    nftPreInsertSelective,
} = require("../controller/ctnft");
const {
    contract_call,
    contract_static_call,
} = require("../contract/ChainCall");
const requestIp = require("request-ip");
const {
    createCollectV1Erc1155,
    createCollectV1Erc1155Call,
    createCollectV2,
    createCollectV2Call,
    collectInit,
    collectInitCall,
    sendCTI,
} = require("./collect");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL,
    isEmpty,
} = require("../rules/rules");
const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
// const {
//   getString,
//   setString,
//   removeString,
//   rpush,
//   lrange,
//   lrem,
// } = require("../redis/redis-client");
// const gasConfig = require("../config/gasConfig.json");
const pino = require("pino");
// const expressPino = require('express-pino-logger');
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const xss = require("xss");
const ethers = require("ethers");
const fetch = require("node-fetch");
const formidable = require("formidable");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const ipfsAPI = require("ipfs-api");
const ipfsNode = ipfsAPI({
    host: GlobalConfig.IPFS[0].HOST,
    port: GlobalConfig.IPFS[0].PORT,
    "api-path": GlobalConfig.IPFS[0].API_PATH,
    protocol: GlobalConfig.IPFS[0].PROTOCOL,
});
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

const {
    balanceQuery,
    queryBalanceAndTokenBalance,
} = require("../chain/balanceQuery");

const {getPriKey} = require("../chain/accountProUtils");

const fs = require("fs");
const path = require("path");
let result = null;
// 非初始化合约地址设置
const ERC721CtnftExample = "0x0F4b3B9EcfD11444cB139dB98DB9aB0Ec417705E";
const ERC1155CtnftExample = "0xeB3AD009272D6C5f045f3d5EaD0ef0e47930877d";
const ERC1155CtnftOwnerExample = "0xbE23EBD6fC9b07945251382A8db82C477ddd5683";
let collectAddressExample = {
    9: ERC721CtnftExample,
    10: ERC1155CtnftExample,
    12: ERC1155CtnftOwnerExample,
};
let gasPrice = "5000100000000";
let isGasPrice = false;
var util = require("ethereumjs-util");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");

/**
 * 保存文件
 */
function saveFile(file) {
    // 读文件
    fs.readFile(file.filepath, (err, data) => {
        if (err) {
            return responseFun(RESPONSE_STATUS.ERROR, err, "");
        }
        const basePath = "./public/files";
        // 创建目录
        createDir(basePath);
        // 写入文件
        fs.writeFile(
            path.join(basePath, file.originalFilename),
            data,
            async (err) => {
                if (err) {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                }
                return responseFun(RESPONSE_STATUS.SUCCESS, "", "success");
            }
        );
    });
}

/**
 * 判断目录是否存在，不存在则创建
 * { recursive: true } 表示多层目录时递归创建
 */
function createDir(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {recursive: true});
    }
}

function Part(account, value) {
    return {
        account,
        value,
    };
}

function Mint721Data(tokenId, tokenURI, creators, royalties, signatures) {
    return {
        tokenId,
        tokenURI,
        creators,
        royalties,
        signatures,
    };
}

const handleUserRouter = async (req, res) => {
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
        // 权限验证
        // var token = req.headers.token;
        // if (!token) {
        //     token = "";
        // }
        // var params = {token: token};
        // var sql =get_mysql(
        //     "NftUserAccesListMapper",
        //     "selectByToken",
        //     params
        // ).result;
        // let accessList = await exec_sql_all(sql)
        //     .then((ret) => {
        //         return ret;
        //     })
        //     .catch((err) => {
        //         console.log("ERR:", err);
        //         return err;
        //     });
        //
        //
        // if (!accessList || accessList.length < 1) {
        //     return responseFun(401,  "没有权限访问!", {});
        // }

        // 创建实名账户
        if (req.path === "/api/account/createUser") {
            let {s_address, s_password, password, expand_data, orderId} = req.body;

            s_address = Web3.utils.toChecksumAddress(s_address);
            if (!validateAddress(s_address).flag) {
                return responseFun(500, validateAddress(s_address).err, {});
            }
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(s_password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(expand_data).flag) {
                return responseFun(500, isEmpty(expand_data).err, {});
            }

            if (isEmpty(orderId).flag) {
                return responseFun(500, isEmpty(orderId).err, {});
            }

            let orderIdEcc = `0x${ethUtil
                .keccak256(Buffer.from(orderId))
                .toString("hex")}`;
            // 判断用户名密码
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: s_address,
            });
            let result01 = await exec_sql(sqlResult.result);
            if (result01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let decWalletResult = await getPriKey(result01.result, s_password);
            let wallet;
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;

                const clientIp = requestIp.getClientIp(req);

                // 判断商家身份
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let authData = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "parentauths",
                    customHttpProvider,
                    [s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS]
                );

                if (authData.err != null) {
                    return responseFun(500, "操作失败,请重试!", {});
                }

                if (
                    // Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                    authData.data.isAuth == true
                ) {
                    // let randomWallet = ethers.Wallet.createRandom();
                    // let keystore = await randomWallet.encrypt(password, callback);
                    let randomWallet = web3.eth.accounts.create();
                    let keystore = await randomWallet.encrypt(password);

                    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
                    //等待其它程序处理上链
                    let sender = s_address;
                    let authTime = 1766841499; // 没有用的参数
                    let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
                    let isAuth = true;
                    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
                    let expandData = expand_data;
                    let caddress = randomWallet.address;
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
                    // let orderId = `0x${ethUtil
                    //     .keccak256(Buffer.from(new Date().getTime() + ""))
                    //     .toString("hex")}`;

                    let privateKeyStr = randomWallet.privateKey;
                    let verifyingContract = authContractAddress;
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
                    let nft_transaction_aql = get_mysql(
                        "NftTransactionMapper",
                        "insertSelective",
                        {
                            from: s_address,
                            to: authContractAddress,
                            status: 0,
                            // "hash": "",
                            // "block_number": "",
                            type: 1,
                            is_reback: 0,
                            order_id: orderId,
                            value: "0",
                            // "origin_data": JSON.stringify(origin_data_json),
                            origin_data: origin_data_json,
                            contract_address: authContractAddress,
                            method:
                                ABI_const["AuthController"].contractName + "#" + "authentication",
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
                    //    save to db
                    let account = {
                        keystore: keystore,
                        address: randomWallet.address,
                        status: 1,
                        psd: password,
                        private_key: "",
                        remark: clientIp,
                        // private_key: randomWallet.private_key
                    };

                    let sqlResult = get_mysql("AccountMapper", "insert", account);
                    let result = await exec_sql(sqlResult.result);
                    return responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                        keystore: keystore,
                        privateKey: randomWallet.privateKey,
                        publicKey: randomWallet.publicKey,
                        address: randomWallet.address,
                    });
                } else {
                    return responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {});
                }
            }
        }

        // 创建实名账户
        if (req.path === "/api/account/createUser") {
            let {s_address, s_password, password, expand_data, orderId} = req.body;

            s_address = Web3.utils.toChecksumAddress(s_address);
            if (!validateAddress(s_address).flag) {
                return responseFun(500, validateAddress(s_password).err, {});
            }
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(s_password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(expand_data).flag) {
                return responseFun(500, isEmpty(expand_data).err, {});
            }

            if (isEmpty(orderId).flag) {
                return responseFun(500, isEmpty(orderId).err, {});
            }

            let orderIdEcc = `0x${ethUtil
                .keccak256(Buffer.from(orderId))
                .toString("hex")}`;
            // 判断用户名密码
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: s_address,
            });
            let result01 = await exec_sql(sqlResult.result);
            if (result01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let decWalletResult = await getPriKey(result01.result, s_password);
            let wallet;
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;

                const clientIp = requestIp.getClientIp(req);

                // 判断商家身份
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let authData = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "parentauths",
                    customHttpProvider,
                    [s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS]
                );

                if (authData.err != null) {
                    return responseFun(500, "操作失败,请重试!", {});
                }

                if (
                    // Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                    authData.data.isAuth == true
                ) {
                    // let randomWallet = ethers.Wallet.createRandom();
                    // let keystore = await randomWallet.encrypt(password, callback);
                    let randomWallet = web3.eth.accounts.create();
                    let keystore = await randomWallet.encrypt(password);

                    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
                    //等待其它程序处理上链
                    let sender = s_address;
                    let authTime = 1766841499; // 没有用的参数
                    let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
                    let isAuth = true;
                    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
                    let expandData = expand_data;
                    let caddress = randomWallet.address;
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
                    // let orderId = `0x${ethUtil
                    //     .keccak256(Buffer.from(new Date().getTime() + ""))
                    //     .toString("hex")}`;

                    let privateKeyStr = randomWallet.privateKey;
                    let verifyingContract = authContractAddress;
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
                    let nft_transaction_aql = get_mysql(
                        "NftTransactionMapper",
                        "insertSelective",
                        {
                            from: s_address,
                            to: authContractAddress,
                            status: 0,
                            // "hash": "",
                            // "block_number": "",
                            type: 1,
                            is_reback: 0,
                            order_id: orderId,
                            value: "0",
                            // "origin_data": JSON.stringify(origin_data_json),
                            origin_data: origin_data_json,
                            contract_address: authContractAddress,
                            method:
                                ABI_const["AuthController"].contractName + "#" + "authentication",
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
                    //    save to db
                    let account = {
                        keystore: keystore,
                        address: randomWallet.address,
                        status: 1,
                        psd: password,
                        private_key: "",
                        remark: clientIp,
                        // private_key: randomWallet.private_key
                    };

                    let sqlResult = get_mysql("AccountMapper", "insert", account);
                    let result = await exec_sql(sqlResult.result);
                    return responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                        keystore: keystore,
                        privateKey: randomWallet.privateKey,
                        publicKey: randomWallet.publicKey,
                        address: randomWallet.address,
                    });
                } else {
                    return responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {});
                }
            }
        }

        // 导入账户实名
        if (req.path === "/api/account/importUser") {
            let {s_address, s_password, private_key, password, expand_data, orderId} = req.body;

            s_address = Web3.utils.toChecksumAddress(s_address);
            if (!validateAddress(s_address).flag) {
                return responseFun(500, validateAddress(s_address).err, {});
            }
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(private_key).flag) {
                return responseFun(500, "invalid private_key", {});
            }
            if (isEmpty(s_password).flag) {
                return responseFun(500, "invalid s_password", {});
            }
            if (isEmpty(expand_data).flag) {
                return responseFun(500, isEmpty(expand_data).err, {});
            }

            if (isEmpty(orderId).flag) {
                return responseFun(500, isEmpty(orderId).err, {});
            }

            let orderIdEcc = `0x${ethUtil
                .keccak256(Buffer.from(orderId))
                .toString("hex")}`;
            // 判断用户名密码
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: s_address,
            });
            let result01 = await exec_sql(sqlResult.result);
            if (result01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let decWalletResult = await getPriKey(result01.result, s_password);
            let wallet;
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;

                const clientIp = requestIp.getClientIp(req);

                // 判断商家身份
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let authData = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "parentauths",
                    customHttpProvider,
                    [s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS]
                );

                if (authData.err != null) {
                    return responseFun(500, "操作失败,请重试!", {});
                }

                if (
                    // Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                    authData.data.isAuth == true
                ) {
                    // let randomWallet = ethers.Wallet.createRandom();
                    // let keystore = await randomWallet.encrypt(password, callback);
                    let randomWallet = new ethers.Wallet(private_key, customHttpProvider);
                    let keystore = await randomWallet.encrypt(password);

                    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
                    //等待其它程序处理上链
                    let sender = s_address;
                    let authTime = 1766841499; // 没有用的参数
                    let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
                    let isAuth = true;
                    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
                    let expandData = expand_data;
                    let caddress = randomWallet.address;
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
                    // let orderId = `0x${ethUtil
                    //     .keccak256(Buffer.from(new Date().getTime() + ""))
                    //     .toString("hex")}`;

                    let privateKeyStr = randomWallet.privateKey;
                    let verifyingContract = authContractAddress;
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
                    let nft_transaction_aql = get_mysql(
                        "NftTransactionMapper",
                        "insertSelective",
                        {
                            from: s_address,
                            to: authContractAddress,
                            status: 0,
                            // "hash": "",
                            // "block_number": "",
                            type: 1,
                            is_reback: 0,
                            order_id: orderId,
                            value: "0",
                            // "origin_data": JSON.stringify(origin_data_json),
                            origin_data: origin_data_json,
                            contract_address: authContractAddress,
                            method:
                                ABI_const["AuthController"].contractName + "#" + "authentication",
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
                    //    save to db
                    let account = {
                        keystore: keystore,
                        address: randomWallet.address,
                        status: 1,
                        psd: password,
                        private_key: "",
                        remark: clientIp,
                        // private_key: randomWallet.private_key
                    };

                    let sqlResult = get_mysql("AccountMapper", "insert", account);
                    let result = await exec_sql(sqlResult.result);
                    return responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                        keystore: keystore,
                        privateKey: randomWallet.privateKey,
                        publicKey: randomWallet.publicKey,
                        address: randomWallet.address,
                    });
                } else {
                    return responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {});
                }
            }
        }

        // 实名账户
        if (req.path === "/api/account/authUser") {
            let {s_address, s_password, address, password, expand_data, orderId} = req.body;
            s_address = Web3.utils.toChecksumAddress(s_address);
            address = Web3.utils.toChecksumAddress(address);
            if (!validateAddress(s_address).flag) {
                return responseFun(500, validateAddress(s_address).err, {});
            }
            if (!validateAddress(address).flag) {
                return responseFun(500, validateAddress(address).err, {});
            }
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(s_password).flag) {
                return PasswordEmpty;
            }
            if (isEmpty(expand_data).flag) {
                return responseFun(500, isEmpty(expand_data).err, {});
            }

            if (isEmpty(orderId).flag) {
                return responseFun(500, isEmpty(expand_data).err, {});
            }

            let orderIdEcc = `0x${ethUtil
                .keccak256(Buffer.from(orderId))
                .toString("hex")}`;

            // 判断接入方用户名密码
            let s_sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: s_address,
            });
            let s_ret01 = await exec_sql(s_sqlResult.result);
            if (s_ret01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let s_decWalletResult = await getPriKey(s_ret01.result, s_password);
            let s_wallet;
            if (s_decWalletResult.err != null) {
                return PasswordError;
            } else {
                s_wallet = s_decWalletResult.result;

                // 判断用户密码是否正确
                // 判断接入方用户名密码
                let c_sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                    address: address,
                });
                let c_ret01 = await exec_sql(c_sqlResult.result);
                if (c_ret01.result == null) {
                    return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                }

                // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
                let c_decWalletResult = await getPriKey(c_ret01.result, password);
                let c_wallet;
                if (c_decWalletResult.err != null) {
                    return PasswordError;
                } else {
                    c_wallet = c_decWalletResult.result;
                    const clientIp = requestIp.getClientIp(req);

                    // 判断商家身份
                    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                    let authData = await contract_static_call(
                        ethers,
                        authContractAddress,
                        ABI_const["AuthController"].abi,
                        "parentauths",
                        customHttpProvider,
                        [s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS]
                    );

                    if (authData.err != null) {
                        return responseFun(500, "操作失败,请重试!", {});
                    }

                    if (
                        // Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                        authData.data.isAuth == true
                    ) {
                        // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
                        //等待其它程序处理上链
                        let sender = s_address;
                        let authTime = 1766841499; // 没有用的参数
                        let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
                        let isAuth = true;
                        let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
                        let expandData = expand_data;
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
                        let verifyingContract = authContractAddress;
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

                        let nft_transaction_aql = get_mysql(
                            "NftTransactionMapper",
                            "insertSelective",
                            {
                                from: s_address,
                                to: authContractAddress,
                                status: 0,
                                // "hash": "",
                                // "block_number": "",
                                type: 1,
                                is_reback: 0,
                                order_id: orderId,
                                value: "0",
                                // "origin_data": JSON.stringify(origin_data_json),
                                origin_data: origin_data_json,
                                contract_address: authContractAddress,
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
                        return responseFun(RESPONSE_STATUS.SUCCESS, "请求成功", {
                            s_address: s_address,
                            address: address,
                            orderId: orderId,
                        });
                    } else {
                        return responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {});
                    }
                }
            }
        }

        // 查询实名账户
        if (req.path === "/api/account/queryAuthUser") {
            const {s_address, address} = req.body;

            if (!validateAddress(address).flag) {
                return responseFun(500, validateAddress(address).err, {});
            }

            if (!validateAddress(s_address).flag) {

                // 判断商家身份
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let isAuth = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "authsSingle",
                    customHttpProvider,
                    [address]
                );

                console.log(isAuth);
                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    authData: {
                        isAuth: isAuth.data,
                    },
                    address: address,
                });
            } else {

                // 判断商家身份
                let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                let authData = await contract_static_call(
                    ethers,
                    authContractAddress,
                    ABI_const["AuthController"].abi,
                    "parentauths",
                    customHttpProvider,
                    [address, s_address]
                );

                console.log(authData);
                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    authData: {
                        caddress: authData.data.caddress,
                        sender: authData.data.sender,
                        authTime: Web3.utils.hexToNumberString(authData.data.authTime),
                        authExpiry: Web3.utils.hexToNumberString(authData.data.authExpiry),
                        isAuth: authData.data.isAuth,
                        authLevel: Web3.utils.hexToNumberString(authData.data.authLevel),
                        expandData: authData.data.expandData,
                    },
                    s_address: s_address,
                    address: address,
                });
            }

        }

        // 创建账户
        if (req.path === "/api/account/createAccount") {
            const {password} = req.body;
            const clientIp = requestIp.getClientIp(req);

            // let randomWallet = ethers.Wallet.createRandom();
            // let keystore = await randomWallet.encrypt(password, callback);
            let randomWallet = web3.eth.accounts.create();
            let keystore = await randomWallet.encrypt(password);

            //    save to db
            let account = {
                keystore: keystore,
                address: randomWallet.address,
                status: 1,
                psd: password,
                private_key: "",
                remark: clientIp,
                // private_key: randomWallet.private_key
            };

            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }

            let sqlResult = get_mysql("AccountMapper", "insert", account);
            let result = await exec_sql(sqlResult.result);
            return responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                keystore: keystore,
                privateKey: randomWallet.privateKey,
                publicKey: randomWallet.publicKey,
                address: randomWallet.address,
            });
        }

        // 查询庄户注册状态
        if (req.path === "/api/account/checkAccount") {
            const {address} = req.body;
            //
            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }

            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let result = await exec_sql(sqlResult.result);
            console.log(result)

            let isExit = (result.result != null);

            return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                address: address,
                isExit,
                isCreated: isExit,
            });
        }

        // 导出账户 (同步)
        if (req.path === "/api/account/exportAccount") {
            const {address, password} = req.body;

            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let ret01 = await exec_sql(sqlResult.result);
            if (ret01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                return;
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let decWalletResult = await getPriKey(ret01.result, password);
            let wallet;
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;
                return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                });
            }
        }

        // 单NFT铸造(异步)
        if (req.path === "/api/account/createctNftAsyncIncludeFile") {
            return new Promise((resolve, reject) => {
                // 创建表单解析对象
                const formsy = formidable({});
                formsy.parse(req, async (err, fields, files) => {
                    console.log("fields:", fields);
                    if (err) {
                        resolve(responseFun(400, "参数解析出错", ""));
                        return;
                    }

                    const file = files.file;

                    const {
                        address,
                        password,
                        title,
                        collectAddress,
                        desc,
                        author,
                        authorDesc,
                    } = fields;
                    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                        address: address,
                    });
                    let result = await exec_sql(sqlResult.result);
                    // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                    return result
                        .then(async (ret) => {
                            if (ret == null) {
                                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                                return;
                            }

                            let decWalletResult = await getPriKey(ret, password);
                            let wallet;
                            if (decWalletResult.err != null) {
                                return PasswordError;
                            } else {
                                wallet = decWalletResult.result;
                                return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                    address: wallet.address,
                                    privateKey: wallet.privateKey,
                                });
                            }

                            try {
                                // address: wallet.address,
                                // privateKey: wallet.privateKey,
                                //    单个藏品铸造

                                const tokenId = address + "c1234567890" + Date.now();
                                // 读文件
                                fs.readFile(file.filepath, (err, data) => {
                                    if (err) {
                                        return responseFun(RESPONSE_STATUS.ERROR, err, "");
                                    }
                                    const basePath = "./public/files";
                                    // 创建目录
                                    createDir(basePath);
                                    // 写入文件
                                    fs.writeFile(
                                        path.join(basePath, file.originalFilename),
                                        data,
                                        async (err) => {
                                            if (err) {
                                                return responseFun(RESPONSE_STATUS.ERROR, err, "");
                                            }

                                            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                                            const resultNft = nftSelectSelectiveCreator(address);

                                            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                                            resultNft
                                                .then(async (retNft) => {
                                                    let transCount;

                                                    let obj = {};
                                                    if (retNft == null) {
                                                        transCount =
                                                            await customHttpProvider.getTransactionCount(
                                                                address
                                                            );
                                                    } else {
                                                        transCount = retNft.nonce + 1;
                                                    }

                                                    //    暂时插入数据库
                                                    console.log("insert...", transCount);
                                                    let nft = {
                                                        address,
                                                        collectAddress,
                                                        isFinish: 0,
                                                        title,
                                                        status: 0, // 未上架
                                                        description: desc,
                                                        tokenId: tokenId,
                                                        author,
                                                        authorDesc,
                                                        owner: address,
                                                        creator: address,
                                                        serverPath: path.join(
                                                            basePath,
                                                            file.originalFilename
                                                        ),
                                                        fileName: file.originalFilename,
                                                        tempPath: file.filepath,
                                                        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                                                        nonce: transCount,
                                                    };

                                                    let result = nftPreInsertSelective(nft);
                                                    return result
                                                        .then(async (ret) => {
                                                            //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                                                            // threadProcess(wallet, tokenId);
                                                            // }, 100)
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                                                    tokenId,
                                                                })
                                                            );
                                                            return;
                                                        })
                                                        .catch((err) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.ERROR, err, {})
                                                            );
                                                            return;
                                                        });
                                                })
                                                .catch((err) => {
                                                    resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                                    return;
                                                });
                                        }
                                    );
                                });
                            } catch (err) {
                                resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                return;
                            }
                        })
                        .catch((err) => {
                            resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                            return;
                        });
                });
            });
        }

        if (req.path === "/api/account/createctNftAsyncSplitParam") {
            return new Promise((resolve, reject) => {
                // 创建表单解析对象
                const {
                    address,
                    password,
                    title,
                    collectAddress,
                    desc,
                    author,
                    authorDesc,
                    file,
                } = req.body;
                let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                    address: address,
                });
                let result = exec_sql(sqlResult.result);
                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                return result
                    .then(async (ret) => {
                        if (ret == null) {
                            resolve(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
                            return;
                        }
                        let wallet;
                        let decWalletResult = await getPriKey(ret, password);
                        if (decWalletResult.err != null) {
                            resolve(PasswordError);
                        } else {
                            wallet = decWalletResult.result;
                        }

                        try {
                            // address: wallet.address,
                            // privateKey: wallet.privateKey,
                            //    单个藏品铸造
                            const tokenId = address + "c1234567890" + Date.now();
                            // 读文件
                            fetch(file)
                                .then((res) => res.arrayBuffer())
                                .then((data) => {
                                    // console.log(data);
                                    const basePath = "/public/files/" + Date.now();
                                    // 创建目录
                                    createDir(basePath);
                                    // 写入文件
                                    var originalFilename = file.substring(
                                        file.lastIndexOf("/") + 1
                                    );
                                    console.log(originalFilename);
                                    fs.writeFile(
                                        path.join(basePath, originalFilename),
                                        Buffer.from(data),
                                        async (err) => {
                                            if (err) {
                                                return responseFun(RESPONSE_STATUS.ERROR, err, "");
                                            }

                                            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                                            const resultNft = nftSelectSelectiveCreator(address);

                                            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                                            resultNft
                                                .then(async (retNft) => {
                                                    let transCount;
                                                    if (retNft == null) {
                                                        transCount =
                                                            await customHttpProvider.getTransactionCount(
                                                                address
                                                            );
                                                    } else {
                                                        transCount = retNft.nonce + 1;
                                                    }

                                                    //    暂时插入数据库
                                                    console.log("insert...", transCount);
                                                    let nft = {
                                                        address,
                                                        collectAddress,
                                                        isFinish: 0,
                                                        title,
                                                        status: 0, // 未上架
                                                        description: desc,
                                                        tokenId: tokenId,
                                                        author,
                                                        authorDesc,
                                                        owner: address,
                                                        creator: address,
                                                        serverPath: path.join(basePath, originalFilename),
                                                        fileName: originalFilename,
                                                        tempPath: file,
                                                        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                                                        nonce: transCount,
                                                    };

                                                    let result = nftPreInsertSelective(nft);
                                                    return result
                                                        .then(async (ret) => {
                                                            //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                                                            // threadProcess(wallet, tokenId);
                                                            // }, 100)
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                                                    tokenId,
                                                                })
                                                            );
                                                            return;
                                                        })
                                                        .catch((err) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.ERROR, err, {})
                                                            );
                                                            return;
                                                        });
                                                })
                                                .catch((err) => {
                                                    resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                                    return;
                                                });
                                        }
                                    );
                                });
                        } catch (err) {
                            resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                            return;
                        }
                    })
                    .catch((err) => {
                        resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                        return;
                    });
            });
        }

        if (req.path === "/api/account/createctNftAsyncDivTokenId") {
            // 创建表单解析对象
            const {
                address,
                password,
                collectAddress,
                file,
                data,
                tokenId,
                rebackUrl,
            } = req.body;
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            try {
                //  判断参数是否满足规范
                let {err, flag} = validateAddress(address);
                if (!flag) {
                    throw err;
                }

                let {err1, flag1} = (() => {
                    let {err, flag} = validateAddress(collectAddress);
                    return {err1: err, flag1: flag};
                })();
                if (!flag1) {
                    throw err1;
                }

                let {err2, flag2} = (() => {
                    let {err, flag} = isJson(data);
                    return {err2: err, flag2: flag};
                })();
                if (!flag2) {
                    throw err2;
                }
                let checkURLRet = checkURL(rebackUrl);
                if (!checkURLRet.flag) {
                    throw checkURLRet.err;
                }
            } catch (e) {
                return responseFun(RESPONSE_STATUS.ERROR, e, {});
            }
            //  判断参数是否满足规范
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let ret = await exec_sql(sqlResult.result);

            if (ret == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }
            let wallet;
            let decWalletResult = await getPriKey(ret, password);
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;
            }
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

            try {
                // 查询合约基本信息  type   == 10
                var sql = get_mysql("collect", "selectByAddress", {
                    address: collectAddress,
                }).result;

                let collectRet = await exec_sql(sql)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return err;
                    });
                if (collectRet == null || collectRet.type !== 9) {
                    throw "collectAddress is error";
                }
                // address: wallet.address,
                // privateKey: wallet.privateKey,
                //    单个藏品铸造
                // const tokenId = tokenId;

                // 读文件
                let dataBuffer = await fetch(file)
                    .then((res) => res.arrayBuffer())
                    .then((dataBuffer) => {
                        return dataBuffer;
                    });
                const basePath = "/public/files/" + Date.now();
                // 创建目录
                createDir(basePath);
                // 写入文件
                var originalFilename = file.substring(file.lastIndexOf("/") + 1);
                console.log(originalFilename);
                let {err} = await new Promise((resolve, reject) => {
                    fs.writeFile(
                        path.join(basePath, originalFilename),
                        Buffer.from(dataBuffer),
                        (err) => {
                            resolve({err});
                        }
                    );
                }).then((ret) => {
                    return ret;
                });
                if (err) {
                    throw err;
                }

                // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                let retNft = await nftSelectSelectiveCreator(address)
                    .then((retNft) => {
                        return retNft;
                    })
                    .catch((err) => {
                        return responseFun(RESPONSE_STATUS.ERROR, err, {});
                    });

                let transCount;
                if (retNft == null) {
                    transCount = await customHttpProvider.getTransactionCount(address);
                } else {
                    transCount = retNft.nonce + 1;
                }

                //    暂时插入数据库
                console.log("insert...", transCount);
                let nft = {
                    address,
                    collectAddress,
                    isFinish: 0,
                    premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
                    status: 0, // 未上架
                    tokenId: tokenId,
                    owner: address,
                    creator: address,
                    serverPath: path.join(basePath, originalFilename),
                    fileName: originalFilename,
                    tempPath: file,
                    tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                    nonce: transCount,
                    rebackUrl: rebackUrl,
                };

                return await nftPreInsertSelective(nft)
                    .then((ret) => {
                        // return ret;
                        return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                            tokenId,
                        });
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return responseFun(RESPONSE_STATUS.ERROR, err, {});
                    });
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }
        }

        // 异步铸造721接口
        if (
            req.path === "/api/account/createctNftAsync" ||
            req.path === "/api/account/createNftAsync"
        ) {
            // 创建表单解析对象
            const {address, password, collectAddress, file, data, rebackUrl} =
                req.body;
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            try {
                //  判断参数是否满足规范
                let ret01 = validateAddress(address);
                if (!ret01.flag) {
                    throw ret01.err;
                }

                let ret02 = validateAddress(collectAddress);

                if (!ret02.flag) {
                    throw ret02.err;
                }

                let ret03 = isJson(data);
                if (!ret03.flag) {
                    throw ret03.err;
                }

                let checkURLRet = checkURL(rebackUrl);
                if (!checkURLRet.flag) {
                    throw checkURLRet.err;
                }

                let checkURLRet1 = checkURL(file);
                if (!checkURLRet1.flag) {
                    throw checkURLRet1.err;
                }
            } catch (e) {
                return responseFun(RESPONSE_STATUS.ERROR, e, {});
            }

            //  判断参数是否满足规范
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let ret04 = await exec_sql(sqlResult.result);

            let ret = ret04.result;
            if (ret == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }

            // 判断账户余额
            var params1 = {address: collectAddress};
            var sql1 = get_mysql("collect", "selectByAddress", params1).result;
            let collectDetail01 = await exec_sql(sql1);

            if (collectDetail01.err != null) {
                console.trace("ERR:", err);
            }
            if (collectDetail01.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "没有找到匹配的合约信息!", {});
            }

            let collectDetail = collectDetail01.result;


            // 查询账户实名状况

            let isBal = await getString("BALANCE_" + collectDetail.owner)
            if (isBal == "1") {
                return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
            }

            // 判断商家身份
            if (GlobalConfig.CAN_AUTH) {
                if (address != collectDetail.owner) {
                    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                    let isAuth = await contract_static_call(
                        ethers,
                        authContractAddress,
                        ABI_const["AuthController"].abi,
                        "authsSingle",
                        customHttpProvider,
                        [address]
                    );
                    if (isAuth.data != true) {
                        return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
                    }
                }
            }

            let wallet;
            // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
            let decWalletResult = await getPriKey(ret, password);
            if (decWalletResult.err != null) {
                throw PasswordError;
            } else {
                wallet = decWalletResult.result;
            }
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
            let balance = await wallet.provider.getBalance(collectDetail.owner);
            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
            let etherString = ethers.utils.formatEther(balance);
            console.log("Balance: ", etherString);
            // 计算初始化合约费用
            if (Number(etherString) < Number(10)) {
                // if (true) {
                //     let {err, hash} = await transfer(neceliby.toString(), address);
                //     if (err != null) {
                //         console.log("txTransfer faild");
                //         return responseFun(RESPONSE_STATUS.ERROR,  err}, {});
                //     }
                //     console.log("tx Hash:", hash);
                return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
            }

            try {
                // 查询合约基本信息  type   == 10
                var params = {address: collectAddress};
                var sql = get_mysql("collect", "selectByAddress", params).result;

                let collectRet02 = await exec_sql(sql)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return err;
                    });
                collectRet02.err;
                let collectRet = collectRet02.result;
                if (collectRet == null || collectRet.type !== 9) {
                    throw "collectAddress is error";
                }
                // address: wallet.address,
                // privateKey: wallet.privateKey,
                //    单个藏品铸造
                const tokenId = address + "c1234567890" + Date.now();
                // 读文件
                let dataBuffer = await fetch(file)
                    .then((res) => res.arrayBuffer())
                    .then((dataBuffer) => {
                        return dataBuffer;
                    });
                const basePath = "/public/files/" + Date.now();
                // 创建目录
                createDir(basePath);
                // 写入文件
                var originalFilename = file.substring(file.lastIndexOf("/") + 1);
                console.log(originalFilename);
                let {err} = await new Promise((resolve, reject) => {
                    fs.writeFile(
                        path.join(basePath, originalFilename),
                        Buffer.from(dataBuffer),
                        (err) => {
                            resolve({err});
                        }
                    );
                }).then((ret) => {
                    return ret;
                });
                if (err) {
                    throw err;
                }

                // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"

                //    暂时插入数据库
                let nft = {
                    address,
                    collectAddress,
                    isFinish: 0,
                    premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
                    status: 0, // 未上架
                    tokenId: tokenId,
                    owner: address,
                    creator: address,
                    serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
                    fileName: originalFilename,
                    tempPath: file,
                    tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                    nonce: "0",
                    rebackUrl: rebackUrl,
                };

                // 插入数据库
                // Get SQL Statement
                var sql = get_mysql("nft", "insertSelective", nft).result;
                return await exec_sql(sql)
                    .then((ret) => {
                        // return ret;
                        // fileUploadIpfs();
                        return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                            tokenId,
                        });
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return responseFun(RESPONSE_STATUS.ERROR, err, {});
                    });
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }
        }

        // 批量铸造
        if (req.path === "/api/account/createctNft1155AsyncV1") {
            // 创建表单解析对象
            const {
                address,
                password,
                collectAddress,
                file,
                supply,
                judge,
                data,
                cMetadata,
            } = req.body;
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            try {
                let {err2, flag2} = (() => {
                    let {err, flag} = isJson(data);
                    return {err2: err, flag2: flag};
                })();
                let {err1, flag1} = (() => {
                    let {err, flag} = isJson(cMetadata);
                    return {err1: err, flag1: flag};
                })();
                if (!flag1 || !flag2) {
                    throw err2;
                }
            } catch (e) {
                return responseFun(RESPONSE_STATUS.ERROR, e, {});
            }
            //  判断参数是否满足规范
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let ret = await exec_sql(sqlResult.result);

            //
            if (ret == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }
            let decWalletResult = await getPriKey(ret, password);
            let wallet;
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;
            }

            try {
                // TODO 这里需要先判断余额是否满足
                //查询需要的gas
                wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

                let name, symbol, tokenUrlPrefix, contractUrl;
                name = cMetadata.name;
                symbol = cMetadata.symbol;
                tokenUrlPrefix = cMetadata.tokenUrlPrefix;
                contractUrl = cMetadata.contractUrl;
                let gasCall = await createCollectV1Erc1155Call(
                    name,
                    symbol,
                    tokenUrlPrefix,
                    contractUrl,
                    wallet
                );
                if (gasCall.err != null) {
                    return responseFun(RESPONSE_STATUS.ERROR, gasCall.err, "");
                } else {
                    let neceGas = gasPrice * gasCall.gaslimit;
                    // 判断手续费是否足够
                    let balance = await wallet.provider.getBalance(address);
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    console.log("Balance: ", balance.toString());
                    console.log("neceGas: ", neceGas);
                    // 这里多赠送手续费
                    let neceGas1 = neceGas + supply * 0.2 * 1000000000000000000;
                    // 判断是否赠送手续费
                    if (neceGas > balance.toString()) {
                        if (judge == true) {
                            //     赠送手续费
                            let walletSys = new ethers.Wallet(
                                privateKeySys,
                                customHttpProvider
                            );
                            let tx = {
                                to: address,
                                // ... or supports ENS names
                                // to: "ricmoo.firefly.eth"
                                // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                                // use this convenience function to convert ether to wei.
                                value: Web3.utils.numberToHex(neceGas1),
                            };

                            let txTransfer = await walletSys.sendTransaction(tx);
                            console.log("txTransfer: :", txTransfer.hash);
                            try {
                                let recept1 = await customHttpProvider.waitForTransaction(
                                    txTransfer.hash
                                );
                                if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                                    throw "Transaction Reverted";
                                }
                            } catch (err) {
                                console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
                                return responseFun(
                                    RESPONSE_STATUS.ERROR,
                                    "Transaction Reverted",
                                    ""
                                );
                            }
                        } else {
                            return responseFun(RESPONSE_STATUS.ERROR, "余额不足", "");
                        }
                    }
                    //    余额足够
                    let contractAddress = await createCollectV1Erc1155(
                        name,
                        symbol,
                        tokenUrlPrefix,
                        contractUrl,
                        wallet,
                        gasPrice,
                        gasCall.gaslimit,
                        false
                    );
                    //  插入收藏夹到数据库
                    let collect = {
                        address: contractAddress,
                        name: name,
                        symbol: symbol,
                        owner: wallet.address,
                        contract_url: contractUrl,
                        token_url_prefix: tokenUrlPrefix,
                        contract_name: ABI_const["CtnftMToken"].contractName,
                        create_address: wallet.address,
                        type: 1, // v1 1155
                    };
                    var sql = get_mysql("collect", "insertSelective", collect).result;

                    let collectRet = await exec_sql(sql)
                        .then((ret) => {
                            return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                ret,
                            });
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
                        });
                    if (collectRet.code == RESPONSE_STATUS.SUCCESS) {
                        const tokenId = "0x1";
                        // 读文件
                        let dataBuffer = await fetch(file)
                            .then((res) => res.arrayBuffer())
                            .then((dataBuffer) => {
                                return dataBuffer;
                            });
                        const basePath = "/public/files/" + Date.now();
                        // 创建目录
                        createDir(basePath);
                        // 写入文件
                        var originalFilename = file.substring(file.lastIndexOf("/") + 1);
                        console.log(originalFilename);
                        let {err} = await new Promise((resolve, reject) => {
                            fs.writeFile(
                                path.join(basePath, originalFilename),
                                Buffer.from(dataBuffer),
                                (err) => {
                                    resolve({err});
                                }
                            );
                        }).then((ret) => {
                            return ret;
                        });
                        if (err) {
                            return responseFun(RESPONSE_STATUS.ERROR, err, "");
                        }

                        // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                        let retNft = await nftSelectSelectiveCreator(address)
                            .then((retNft) => {
                                return retNft;
                            })
                            .catch((err) => {
                                return responseFun(RESPONSE_STATUS.ERROR, err, {});
                            });

                        let transCount;
                        if (retNft == null) {
                            transCount = await customHttpProvider.getTransactionCount(address);
                        } else {
                            transCount = retNft.nonce + 1;
                        }

                        //    暂时插入数据库
                        console.log("insert...", transCount);
                        let nft = {
                            address,
                            isFinish: 0,
                            premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
                            status: 0, // 未上架
                            supply,
                            tokenId: tokenId,
                            owner: address,
                            creator: address,
                            serverPath: path.join(basePath, originalFilename),
                            fileName: originalFilename,
                            tempPath: file,
                            tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                            nonce: transCount,
                        };

                        // 插入数据库
                        // Get SQL Statement
                        var sql = get_mysql("nft", "insertSelective", nft);
                        return await exec_sql(sql)
                            .then((ret) => {
                                return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                    tokenId,
                                    contractAddress,
                                });
                            })
                            .catch((err) => {
                                console.log("ERR:", err);
                                return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
                            });
                    } else {
                        return collectRet;
                    }
                }
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }
        }

        if (
            req.path === "/api/account/createctNft1155Async" ||
            req.path === "/api/account/createNft1155Async"
        ) {
            // 创建表单解析对象
            const {address, password, collectAddress, file, data, supply, rebackUrl} =
                req.body;
            let {} = req.body;
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            try {
                //  判断参数是否满足规范
                let ret01 = validateAddress(address);
                if (!ret01.flag) {
                    throw ret01.err;
                }

                let ret02 = validateAddress(collectAddress);
                if (!ret02.flag) {
                    throw ret02.err;
                }

                let ret03 = isJson(data);
                if (!ret03.flag) {
                    throw ret03.err;
                }
                let checkURLRet = checkURL(rebackUrl);
                if (!checkURLRet.flag) {
                    throw checkURLRet.err;
                }

                let checkURLRet1 = checkURL(file);
                if (!checkURLRet1.flag) {
                    throw checkURLRet1.err;
                }
            } catch (e) {
                return responseFun(RESPONSE_STATUS.ERROR, e, {});
            }
            if (supply < 1) {
                return responseFun(RESPONSE_STATUS.ERROR, "supply 必须大于0", {});
            }
            // if (supply >= 100000) {
            //     return responseFun(RESPONSE_STATUS.ERROR,  "supply must less than 100000", {});
            // }

            //  判断参数是否满足规范
            let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let ret002 = await exec_sql(sqlResult.result);

            //
            if (ret002.result == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
            }
            let wallet;
            // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
            let decWalletResult = await getPriKey(ret002.result, password);
            if (decWalletResult.err != null) {
                return PasswordError;
            } else {
                wallet = decWalletResult.result;
            }

            try {
                // 查询合约基本信息  type   == 10

                var params = {address: collectAddress};
                var sql = get_mysql("collect", "selectByAddress", params).result;

                let collectRet02 = await exec_sql(sql);
                if (collectRet02.err != null) {
                    console.log("ERR:", collectRet02.err);
                }
                let collectRet = collectRet02.result;
                if (
                    collectRet == null ||
                    (collectRet.type !== 10 && collectRet.type !== 12)
                ) {
                    throw "collectAddress is error";
                }

                // 查询账户实名状况

                // 判断商家身份
                if (GlobalConfig.CAN_AUTH) {
                    if (address != collectRet.owner) {
                        let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                        let isAuth = await contract_static_call(
                            ethers,
                            authContractAddress,
                            ABI_const["AuthController"].abi,
                            "authsSingle",
                            customHttpProvider,
                            [address]
                        );
                        if (isAuth.data != true) {
                            return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
                        }
                    }
                }
                // address: wallet.address,
                // privateKey: wallet.privateKey,
                //    单个藏品铸造
                const tokenId = address + "c1234567890" + Date.now();
                // 读文件
                let dataBuffer = await fetch(file)
                    .then((res) => res.arrayBuffer())
                    .then((dataBuffer) => {
                        return dataBuffer;
                    });
                const basePath = "/public/files/" + Date.now();
                // 创建目录
                createDir(basePath);
                // 写入文件
                var originalFilename = file.substring(file.lastIndexOf("/") + 1);
                console.log(originalFilename);
                let {err} = await new Promise((resolve, reject) => {
                    fs.writeFile(
                        path.join(basePath, originalFilename),
                        Buffer.from(dataBuffer),
                        (err) => {
                            resolve({err});
                        }
                    );
                }).then((ret) => {
                    return ret;
                });
                if (err) {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                }

                // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                let retNft = await nftSelectSelectiveCreator(address)
                    .then((retNft) => {
                        return retNft;
                    })
                    .catch((err) => {
                        return responseFun(RESPONSE_STATUS.ERROR, err, {});
                    });

                // await setString(
                //   "WALLET_ACCOUNT_" + address,
                //   JSON.stringify(decWalletResult.result),
                //   300
                // );

                //    暂时插入数据库
                let nft = {
                    address,
                    isFinish: 0,
                    premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
                    status: 0, // 未上架
                    supply,
                    collectAddress,
                    tokenId: tokenId,
                    owner: address,
                    creator: address,
                    serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
                    fileName: originalFilename,
                    tempPath: file,
                    tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                    nonce: "0",
                    rebackUrl: rebackUrl,
                };

                // 插入数据库
                // Get SQL Statement

                var sql = get_mysql("nft", "insertSelective", nft).result;
                return await exec_sql(sql)
                    .then((ret) => {
                        // fileUploadIpfs();
                        return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                            tokenId,
                        });
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
                    });
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }
        }

        //创建收藏夹
        if (req.path === "/api/account/createctCollect") {
            // 创建表单解析对象
            try {
                const {address, password, cMetadata, type} = req.body;
                //  判断参数是否满足规范
                if (isEmpty(password).flag) {
                    return PasswordEmpty;
                }

                let ret01 = validateAddress(address);
                if (!ret01.flag) {
                    throw ret01.err;
                }

                let ret02 = isJson(cMetadata);
                if (!ret02.flag) {
                    throw ret02.err;
                }

                if (JSON.stringify(cMetadata).indexOf("{") == -1) {
                    return responseFun(RESPONSE_STATUS.ERROR, "invalid paramter data", {});
                }

                // 判断实名
                // 这里好像不需要判断实名, 因为这里一般都是项目方调用, 不会有手续费垫付的情况发生

                let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                    address: address,
                });
                let ret03 = await exec_sql(sqlResult.result);

                let ret = ret03.result;
                if (ret == null) {
                    return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                }

                if (ret.psd != password) {
                    throw "invalid password";
                }
                if (!cMetadata.tokenUrlPrefix) {
                    throw "invalid tokenUrlPrefix";
                }
                if (!cMetadata.tokenUrlPrefix.endsWith("/")) {
                    throw "invalid tokenUrlPrefix endsWith /";
                }

                let wallet;

                let decWalletResult = await getPriKey(ret, password);
                if (decWalletResult.err != null) {
                    return PasswordError;
                } else {
                    wallet = decWalletResult.result;
                }
                wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

                // 创建收藏夹
                //    查询创建合约的手续费
                let {err, gaslimit} = await createCollectV2Call(type, wallet);

                let initResult = await collectInitCall(
                    cMetadata.name,
                    cMetadata.symbol,
                    cMetadata.tokenUrlPrefix,
                    cMetadata.contractUrl,
                    type,
                    collectAddressExample,
                    wallet
                );
                let errInit, gaslimitInit;
                errInit = initResult.err;
                gaslimitInit = initResult.gaslimit;
                if (err != null) {
                    console.log("createCollectV2Call faild");
                    return responseFun(RESPONSE_STATUS.ERROR, err, {});
                }
                if (errInit != null) {
                    console.log("createCollectV2Call faild");
                    return responseFun(RESPONSE_STATUS.ERROR, errInit, {});
                }
                //    赠送合约手续费
                let neceliby = ethers.utils.formatEther((gasPrice * gaslimit).toString());
                let necelibyInit = ethers.utils.formatEther(
                    (gasPrice * gaslimitInit).toString()
                );
                console.log("neceliby*:", neceliby);
                console.log("necelibyInit*:", necelibyInit);
                console.log("gaslimitInit:", gaslimitInit);
                let necelibyTotal = Number(neceliby) + Number(necelibyInit);
                let balance = await wallet.provider.getBalance(address);
                // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                let etherString = ethers.utils.formatEther(balance);
                console.log("Balance: ", etherString);
                // 计算初始化合约费用
                console.log("余额是否充足:", Number(balance) > Number(necelibyTotal));
                if (Number(etherString) < Number(necelibyTotal)) {
                    // if (true) {
                    //     let {err, hash} = await transfer(neceliby.toString(), address);
                    //     if (err != null) {
                    //         console.log("txTransfer faild");
                    //         return responseFun(RESPONSE_STATUS.ERROR,  err}, {});
                    //     }
                    //     console.log("tx Hash:", hash);
                    return responseFun(RESPONSE_STATUS.ERROR, "账户余额不足!", {});
                }
                let nonce = await customHttpProvider.getTransactionCount(
                    address,
                    "latest"
                );
                //    创建合约
                let collectAddress = await createCollectV2(
                    wallet,
                    gasPrice,
                    // gasConfig.create_contract1155.gasPrice,
                    gaslimit,
                    // gasConfig.create_contract1155.gasLimit,
                    type,
                    false
                );
                // if (collectAddress == null) {
                //     return responseFun(RESPONSE_STATUS.ERROR,  "创建合约失败", {});
                // }
                // 这里前面已经可以算出合约地址, 这里为了方便,直接计算得出, 不使用返回值.
                // collectAddress = "0x" + util.generateAddress(Buffer.from(stripHexPrefix(wallet.address), "hex"), nonce).toString("hex");
                //    初始化{err, hash}
                let result1 = await collectInit(
                    cMetadata.name,
                    cMetadata.symbol,
                    cMetadata.tokenUrlPrefix,
                    cMetadata.contractUrl,
                    type,
                    collectAddress,
                    wallet,
                    gaslimitInit
                );
                if (result1.err != null) {
                    console.log("txTransfer faild");
                    return responseFun(RESPONSE_STATUS.ERROR, result1.err, {});
                }
                let contractName;
                if (type == 10) {
                    contractName = ABI_const["ERC721Ctnft"].contractName;
                } else if (type == 12) {
                    contractName = ABI_const["ERC1155CtnftOwner"].contractName;
                } else if (type == 9) {
                    contractName = ABI_const["ERC1155Ctnft"].contractName;
                } else if (type == 1) {
                    contractName = ABI_const["CtnftMToken"].contractName;
                } else {
                    contractName = "";
                }
                //  插入收藏夹到数据库
                let collect = {
                    address: collectAddress,
                    name: cMetadata.name,
                    symbol: cMetadata.symbol,
                    owner: wallet.address,
                    contract_url: cMetadata.contractUrl,
                    token_url_prefix: cMetadata.tokenUrlPrefix,
                    contract_name: contractName,
                    create_address: wallet.address,
                    type: type, // v1 1155
                };

                var sql = get_mysql("collect", "insertSelective", collect).result;

                let ret04 = await exec_sql(sql);
                if (ret04.err == null) {
                    return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                        collectAddress,
                        type,
                        hash: result1.hash,
                    });
                } else {
                    return responseFun(RESPONSE_STATUS.ERROR, ret04.err, {});
                }
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, {});
            }
        }

        // 单NFT铸造(同步)
        if (req.path === "/api/account/createctNft") {
            return new Promise((resolve, reject) => {
                // 创建表单解析对象
                const form = formidable({});
                form.parse(req, async (err, fields, files) => {
                    console.log("fields:", fields);
                    if (err) {
                        resolve(responseFun(400, "参数解析出错", ""));
                        return;
                    }

                    const file = files.file;

                    const {
                        address,
                        password,
                        title,
                        collectAddress,
                        desc,
                        author,
                        authorDesc,
                    } = fields;
                    if (isEmpty(password).flag) {
                        return PasswordEmpty;
                    }
                    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                        address: address,
                    });
                    let result = await exec_sql(sqlResult.result);

                    // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                    return result.then(async (ret) => {
                        if (ret == null) {
                            return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                            return;
                        }
                        let wallet;
                        let decWalletResult = await getPriKey(ret, password);
                        if (decWalletResult.err != null) {
                            resolve(PasswordError);
                        } else {
                            wallet = decWalletResult.result;
                        }

                        try {
                            // address: wallet.address,
                            // privateKey: wallet.privateKey,
                            //    单个藏品铸造

                            const tokenId = address + "c1234567890" + Date.now();
                            var tokenURI = ""; //  这里需要传递过来我这边还是直接是个地址,这是一个问题
                            // 从私钥获取一个签名器 Signer
                            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
                            let balance = await wallet.provider.getBalance(address);
                            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                            let etherString = ethers.utils.formatEther(balance);
                            console.log("Balance: ", etherString);
                            let txTransfer = "";

                            if (etherString < 5) {
                                //    赠送手续费
                                let walletSys = new ethers.Wallet(
                                    privateKeySys,
                                    customHttpProvider
                                );
                                let tx = {
                                    to: address,
                                    // ... or supports ENS names
                                    // to: "ricmoo.firefly.eth",

                                    // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                                    // use this convenience function to convert ether to wei.
                                    value: ethers.utils.parseEther("5.0"),
                                };

                                txTransfer = await walletSys.sendTransaction(tx);
                                console.log("txTransfer:", txTransfer.hash);
                                // txTransfer.wait();

                                // console.log(txTransfer);
                            }
                            // 这里上传IPFS资源文件
                            // 图片资源上传ipfs
                            fs.readFile(file.filepath, (err, data) => {
                                ipfsNode
                                    .add(data)
                                    .then(async (imgResponse) => {
                                        console.log(imgResponse[0].path);
                                        //PIN
                                        ipfsNode.pin.add(imgResponse[0].path);
                                        let imgIpfsAddress = imgResponse[0].path;
                                        // 元数据上传ipfs
                                        const data = new Object();
                                        data.name = title;
                                        data.description = desc;
                                        data.image =
                                            "https://dream.chaonft.cn/ipfs/api/v0/cat/" +
                                            imgIpfsAddress;
                                        data.author = author;
                                        data.authorDesc = authorDesc;
                                        ipfsNode
                                            .add(Buffer.from(JSON.stringify(data), "utf-8"))
                                            .then(async (response) => {
                                                try {
                                                    ipfsNode.pin.add(response[0].path);

                                                    console.log(response[0].path);
                                                    if (txTransfer != "") {
                                                        await customHttpProvider.waitForTransaction(
                                                            txTransfer.hash
                                                        );
                                                    }
                                                    // 使用Provider 连接合约，将只有对合约的可读权限
                                                    let contract = new ethers.Contract(
                                                        collectAddress,
                                                        ABI_const["ERC721Ctnft"].abi,
                                                        customHttpProvider
                                                    );
                                                    // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
                                                    let contractWithSigner = contract.connect(wallet);
                                                    let transferTo = address;
                                                    let signatures = [];
                                                    let minter = address;
                                                    var creators = Part(minter, 10000);
                                                    // All overrides are optional
                                                    // let transactionCount1Tx1 = await customHttpProvider.getTransactionCount(address, "pending");
                                                    // console.log("发送交易总数: " + transactionCount);
                                                    // console.log("发送交易总数1: " + transactionCount1Tx1);
                                                    let overrides = {
                                                        // The maximum units of gas for the transaction to use
                                                        // gasLimit: 210000,
                                                        // The price (in wei) per unit of gas
                                                        // gasPrice: ethers.utils.parseUnits('5000.1', 'gwei'),
                                                        // The nonce to use in the transaction
                                                        // nonce: transactionCount1Tx1,
                                                        // The amount to send with the transaction (i.e. msg.value)
                                                        // value: utils.parseEther('1.0'),
                                                        // The chain ID (or network ID) to use
                                                        // chainId: 27
                                                    };
                                                    tokenURI = response[0].path;
                                                    // 设置一个新值，返回交易
                                                    let tx = await contractWithSigner.mintAndTransfer(
                                                        Mint721Data(
                                                            tokenId,
                                                            tokenURI,
                                                            [creators],
                                                            [],
                                                            [signatures]
                                                        ),
                                                        transferTo,
                                                        overrides
                                                    );

                                                    // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364
                                                    console.log(tx.hash);

                                                    // let transCount = await customHttpProvider.getTransactionCount(address, "latest");

                                                    // 操作还没完成，需要等待挖矿
                                                    let ret = await customHttpProvider.waitForTransaction(
                                                        tx.hash
                                                    );
                                                    // save db
                                                    let nft = {
                                                        address,
                                                        collectAddress,
                                                        isFinish: 1,
                                                        title,
                                                        status: 0, // 未上架
                                                        description: data.description,
                                                        tokenId: tokenId,
                                                        imgPath: data.image,
                                                        metaData: response[0].path,
                                                        metaDataSource: JSON.stringify(data).replace(
                                                            /&quot;/g,
                                                            '\\"'
                                                        ),
                                                        author,
                                                        authorDesc,
                                                        owner: address,
                                                        creator: address,
                                                        hash: tx.hash,

                                                        nonce: ret.nonce,
                                                    };
                                                    // console.log(nft)

                                                    let result = nftInsertSelective(nft);

                                                    return result
                                                        .then((ret) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                                                    hash: tx.hash,
                                                                })
                                                            );
                                                            return;
                                                        })
                                                        .catch((err) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.ERROR, err, "")
                                                            );
                                                            return;
                                                        });
                                                } catch (e) {
                                                    resolve(
                                                        responseFun(RESPONSE_STATUS.ERROR, e.message, "")
                                                    );
                                                    return;
                                                }
                                            })
                                            .catch((err) => {
                                                resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                                return;
                                            });
                                    })
                                    .catch((err) => {
                                        resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                        return;
                                    });
                            });
                        } catch (err) {
                            resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                            return;
                        }
                    });
                });
            });
        }

        // 查询和批量查询
        if (req.path === "/api/account/queryNft") {
            const {tokenIds} = req.body;
            const result = nftSelectSelective(tokenIds);
            return result
                .then((ret) => {
                    return responseFun(RESPONSE_STATUS.SUCCESS, "", ret);
                })
                .catch((err) => {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                });
        }

        // 查询 transaction
        if (req.path === "/api/account/queryTransaction") {
            const {orderId} = req.body;
            var sqlQueryByOrderId = get_mysql(
                "trans_form_list",
                "selectByOrderId",
                {
                    orderId: orderId,
                }
            ).result;
            let ex_orderId_ret = await exec_sql(sqlQueryByOrderId);
            console.log("query_orderId_ret:", ex_orderId_ret)
            if (ex_orderId_ret.result != null) {
                let statusDesc = '';
                switch (ex_orderId_ret.result.t_status) {
                    case 8: {
                        statusDesc = '初次回调失败'
                        break
                    }
                    case 18: {
                        statusDesc = '最终回调失败'
                        break
                    }
                    case 4: {
                        statusDesc = '回调成功'
                        break
                    }
                    case 6: {
                        statusDesc = '等待回调'
                        break
                    }
                    case 3: {
                        statusDesc = '交易上链失败'
                        break
                    }
                    default: {
                        statusDesc = '等待处理'
                        break
                    }
                }

                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    from: ex_orderId_ret.result.t_from,
                    to: ex_orderId_ret.result.t_to,
                    amount: ex_orderId_ret.result.amount,
                    token_id: ex_orderId_ret.result.token_id,
                    orderId: ex_orderId_ret.result.orderId,
                    hash: ex_orderId_ret.result.hash,
                    collectAddress: ex_orderId_ret.result.collectAddress,
                    status: ex_orderId_ret.result.t_status,
                    statusDesc: statusDesc,
                });
            } else {
                return responseFun(RESPONSE_STATUS.ERROR, "订单不存在!", "");
            }
        }

        // 查询 余额
        if (req.path === "/api/account/queryAccountBalance") {
            const {tokenId, address, collectAddress} = req.body;

            var balanceRet = await queryBalanceAndTokenBalance(
                address,
                collectAddress,
                tokenId
            );
            if (balanceRet.err != null) {
                throw err;
            } else {
                let mainBalance = ethers.utils.formatEther(
                    Web3.utils.hexToNumberString(balanceRet.data.balance)
                );
                let tokenBalance = Web3.utils.hexToNumberString(
                    balanceRet.data.tokenBalance
                );

                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    balance: mainBalance,
                    tokenBalance: tokenBalance,
                });
            }
        }

        // 回调  TODO 这个可能需要考虑是否需要回调
        if (req.path === "/api/account/callFun") {
            const {tokenId, status, key} = req.body;
            return {code: 0};
        }

        // 积分相关接口
        if (req.path === "/api/account/rcti") {
            const {address, password, type, amount} = req.body;
            // 2 注册积分    1  消费积分
            try {
                try {
                    //  判断参数是否满足规范
                    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                        address: address,
                    });
                    let ret = await exec_sql(sqlResult.result);

                    if (ret == null) {
                        return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                    }

                    let decWalletResult = await getPriKey(ret, password);
                    if (decWalletResult.err != null) {
                        throw "invalid password";
                    } else {
                        wallet = decWalletResult.result;
                    }
                } catch (err) {
                    throw "invalid password";
                }

                var params = {type: 11}; // 草田积分合约
                var sql = get_mysql("collect", "selectByType", params).result;
                let collectRet = await exec_sql(sql)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return err;
                    });
                if (collectRet == null) {
                    throw "collectAddress is error";
                }
                let contractAddress = collectRet.address;
                let tamount;
                if (amount == undefined) {
                    tamount = 1;
                } else {
                    tamount = amount;
                }
                let {err, hash} = await sendCTI(
                    contractAddress,
                    address,
                    type,
                    tamount
                );
                if (err != null) {
                    throw err;
                }
                return responseFun(RESPONSE_STATUS.SUCCESS, null, {
                    hash: hash,
                    type: type,
                });
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, null);
            }
        }

        // 通过个人身份转账接口
        if (req.path === "/api/account/transfer_f") {
            logger.debug("In :%s", new Date().getTime());
            const {address, password, amount, to, tokenId, rebackUrl, orderId} =
                req.body;
            if (isEmpty(password).flag) {
                return PasswordEmpty;
            }
            let collectAddress;
            try {
                let wallet;
                //  判断参数是否满足规范
                let ret01 = validateAddress(address);
                if (!ret01.flag) {
                    throw ret01.err;
                }

                let ret02 = validateAddress(to);
                if (!ret02.flag) {
                    throw ret02.err;
                }
                // if (address.toLowerCase() == to.toLowerCase()) {
                //     throw  "transfer is owner!"
                // }

                let isDump = await getString(orderId)
                if (isDump == "1") {
                    return responseFun(RESPONSE_STATUS.ERROR, "ER_DUP_ENTRY", "");
                }

                // 数据库查询订单号状态
                var sqlQueryByOrderId = get_mysql(
                    "trans_form_list",
                    "selectByOrderId",
                    {
                        orderId: orderId,
                    }
                ).result;
                let ex_orderId_ret = await exec_sql(sqlQueryByOrderId);
                console.log("ex_orderId_ret:", ex_orderId_ret)
                if (ex_orderId_ret.result != null) {
                    console.log("数据库判断订单号冲突!")
                    return responseFun(RESPONSE_STATUS.ERROR, "ER_DUP_ENTRY", "");
                }

                //这里直接查询合约地址
                logger.debug("Start Query NFT:%s", new Date().getTime());
                var params = {tokenId: tokenId};
                var sqlQueryByTokenId = get_mysql(
                    "nft",
                    "selectByTokenId",
                    params
                ).result;
                let nftObj_ret = await exec_sql(sqlQueryByTokenId);

                if (nftObj_ret.err != null) {
                    console.log("ERR:", nftObj_ret.err);
                }
                let nftObj = nftObj_ret.result;
                if (nftObj == null) {
                    throw "nft is not exist!";
                }
                logger.debug("Over Query NFT:%s", new Date().getTime());
                let supply = nftObj["supply"];
                collectAddress = nftObj["collectAddress"];

                var params = {address: nftObj["collectAddress"]}; // 草田积分合约
                logger.debug("开始Query Contract:%s", new Date().getTime());
                var sql = get_mysql("collect", "selectByAddress", params).result;
                let collectDetail_ret = await exec_sql(sql)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return err;
                    });
                if (collectDetail_ret.err != null) {
                    console.log("ERR:", collectDetail_ret.err);
                }
                let collectDetail = collectDetail_ret.result;
                let isBal = await getString("BALANCE_" + collectDetail.owner)
                if (isBal == "1") {
                    console.log("redis!" + collectDetail.owner)
                    return responseFun(RESPONSE_STATUS.ERROR, "手续费余额不足!", {});
                }
                logger.debug("Over Query Contract:%s", new Date().getTime());

                if (collectDetail == null) {
                    throw "collectAddress is error";
                }


                logger.debug("Start Query Account:%s", new Date().getTime());
                let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                    address: address,
                });
                let ret03 = await exec_sql(sqlResult.result);
                logger.debug("Over Query Account:%s", new Date().getTime());
                let ret = ret03.result;
                if (ret == null) {
                    return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                }

                let checkURLRet = checkURL(rebackUrl);
                if (!checkURLRet.flag) {
                    throw checkURLRet.err;
                }

                //
                logger.debug("Start dec account:%s", new Date().getTime());
                let decWalletResult = await getPriKey(ret, password);
                logger.debug("Dec Over Query 账户:%s", new Date().getTime());
                if (decWalletResult.err != null) {
                    return PasswordError;
                } else {
                    wallet = decWalletResult.result;
                }


                // 查询账户实名状况

                // 判断商家身份
                if (GlobalConfig.CAN_AUTH) {
                    if (address != collectDetail.owner) {
                        let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
                        let isAuth = await contract_static_call(
                            ethers,
                            authContractAddress,
                            ABI_const["AuthController"].abi,
                            "authsSingle",
                            customHttpProvider,
                            [address]
                        );
                        if (isAuth.data != true) {
                            return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
                        }
                    }
                }

                // 判断合约转账类型
                let contract;
                let transObjFrom;
                let transObjTo;
                let juAmount = 0;
                switch (collectDetail["type"]) {
                    case 10:
                    case 12:
                        contract = new ethers.Contract(
                            collectAddress,
                            ABI_const["ERC1155Ctnft"].abi, // 10 和 12 是同一个abi
                            customHttpProvider
                        );
                        //    查询协议tokenId的总发行

                        //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
                        //     链上判断, 这个是一个模糊判断
                        // wallet = new ethers.Wallet(
                        //     wallet.privateKey,
                        //     customHttpProvider
                        // );
                        // let contractWithSigner = contract.connect(wallet);

                        // 链上余额判断
                        // let accountBalance = await contractWithSigner.balanceOf(
                        //     address,
                        //     tokenId
                        // );
                        // if (accountBalance < amount) {
                        //     throw  "chain balance is enough!"
                        // }

                        // 数据库余额判断
                        //    数据库已有数据判断

                        // 数据量大的情况下, 这里可能会出现数据库阻塞, 所以发行方不进行这个判断
                        // TODO 这里要进行余额判断
                        // 这里对藏品余额进行判断
                        // 这里对手续费余额进行判断
                        logger.debug("Start Query Balance:%s", new Date().getTime());
                        var balanceRet = await queryBalanceAndTokenBalance(
                            address,
                            collectAddress,
                            tokenId
                        );
                        logger.debug("Over Query Balance:%s", new Date().getTime());
                        if (balanceRet.err != null) {
                            throw err;
                        } else {
                            let mainBalance = ethers.utils.formatEther(
                                Web3.utils.hexToNumberString(balanceRet.data.balance)
                            );
                            let tokenBalance = Web3.utils.hexToNumberString(
                                balanceRet.data.tokenBalance
                            );
                            // 这里如果是合约发行方的话, 做手续费判断   1155协议
                            if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                                if (mainBalance < 50) {
                                    await setString("BALANCE_" + address, "1", 300)
                                    throw "手续费余额不足";
                                }
                            }

                            if (tokenBalance < amount) {
                                throw "藏品库存不足";
                            }

                            // if (nftObj["address"].toLowerCase() != address.toLowerCase()) {
                            //     transObjFrom = await exec_sql(
                            //         get_mysql(
                            //             "trans_form_list",
                            //             "selectByFormAndTokenId",
                            //             {token_id: tokenId, t_from: address}
                            //         ).result
                            //     )
                            //         .then((ret) => {
                            //             return ret;
                            //         })
                            //         .catch((err) => {
                            //             console.log("ERR:", err);
                            //             return err;
                            //         });
                            //     transObjTo = await exec_sql(
                            //         get_mysql(
                            //             "trans_form_list",
                            //             "selectByToAndTokenId",
                            //             {token_id: tokenId, t_to: address}
                            //         ).result
                            //     )
                            //         .then((ret) => {
                            //             return ret;
                            //         })
                            //         .catch((err) => {
                            //             console.log("ERR:", err);
                            //             return err;
                            //         });
                            //
                            //     juAmount = 0;
                            //     if (transObjFrom && transObjFrom["sumAmount"]) {
                            //         juAmount -= Number(transObjFrom["sumAmount"]);
                            //     }
                            //
                            //     if (transObjTo && transObjTo["sumAmount"]) {
                            //         juAmount += Number(transObjTo["sumAmount"]);
                            //     }
                            //     // console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
                            //     //     transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
                            //     //     nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());
                            //
                            //     //这里对余额进行判断
                            //     //判断是否是发行方,然后根据发行量进行判断
                            //     if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                            //         // if (supply > 0) {   // 这里再判断一次, 按理12是都是大于0的
                            //         if (Number(supply) - Number(juAmount) <= 0) {
                            //             throw "db balance is enough!";
                            //         }
                            //         // }
                            //     } else {
                            //         // 根据数据库的转账数量来判断
                            //         // 不是发行方,根据数据库转入转出记录判断
                            //         if (Number(juAmount) <= 0) {
                            //             throw "db balance is enough!";
                            //         }
                            //     }
                            // }

                            // save db
                            //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
                            var sqlQueryByTokenIdAndForm = get_mysql(
                                "trans_form_list",
                                "insertSelective",
                                {
                                    t_from: address,
                                    t_to: to,
                                    collectAddress: collectAddress,
                                    amount: amount,
                                    reback_url: rebackUrl,
                                    token_id: tokenId,
                                    orderId: orderId,
                                    type: collectDetail["type"],
                                    t_status: 1,
                                }
                            ).result;
                            let ex_ret = await exec_sql(sqlQueryByTokenIdAndForm);

                            if (ex_ret.err != null) {
                                console.log("ERR:", ex_ret.err);
                                console.log("ERR_JUDGE:", "ER_DUP_ENTRY" == ex_ret.err);
                                if ("ER_DUP_ENTRY" == ex_ret.err) {
                                    await setString(orderId, "1", 300);
                                }
                                let isDump = await getString(orderId);
                                console.log("isDump:", isDump);
                                return responseFun(RESPONSE_STATUS.ERROR, ex_ret.err, "");
                            } else {
                                logger.debug("Out:%s", new Date().getTime());
                                return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                    orderId: orderId,
                                });
                            }

                            break;
                        }
                    case 9:
                        contract = new ethers.Contract(
                            collectAddress,
                            ABI_const["ERC721Ctnft"].abi, // 10 和 12 是同一个abi
                            customHttpProvider
                        );
                        //    Query 协议tokenId的总发行
                        supply = 1;

                        //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
                        //     链上判断, 这个是一个模糊判断
                        // wallet = new ethers.Wallet(
                        //     wallet.privateKey,
                        //     customHttpProvider
                        // );
                        // contractWithSigner = contract.connect(wallet);
                        //
                        //
                        // // 链上余额判断
                        // let accountAddress = await contractWithSigner.ownerOf(
                        //     tokenId
                        // );
                        // if (accountAddress != wallet.address) {
                        //     throw  "chain balance is enough!"
                        // }

                        // 数据库余额判断
                        //    数据库已有数据判断
                        let transObjFrom_ret01 = await exec_sql(
                            get_mysql("trans_form_list", "selectByFormAndTokenId", {
                                token_id: tokenId,
                                t_from: address,
                            }).result
                        );
                        if (transObjFrom_ret01.err) {
                            console.log("ERR:", transObjFrom_ret01.err);
                        }
                        transObjFrom = transObjFrom_ret01.result;

                        let transObjTo_ret02 = await exec_sql(
                            getMysqlSqlByTabNameAndSqlNameAndParam(
                                "trans_form_list",
                                "selectByToAndTokenId",
                                {token_id: tokenId, t_to: address}
                            ).result
                        );

                        if (transObjTo_ret02.err != null) {
                            console.log("ERR:", transObjTo_ret02.err);
                        }
                        transObjTo = transObjTo_ret02.result;
                        juAmount = 0;
                        if (transObjFrom && transObjFrom["sumAmount"]) {
                            juAmount -= Number(transObjFrom["sumAmount"]);
                        }

                        if (transObjTo && transObjTo["sumAmount"]) {
                            juAmount += Number(transObjTo["sumAmount"]);
                        }

                        // console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
                        //     transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
                        //     nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());
                        //这里对余额进行判断
                        //判断是否是发行方,然后根据发行量进行判断
                        if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                            // if (!supply > 0) {   // 这里再判断一次, 按理9是都是为空的
                            if (supply - juAmount <= 0) {
                                throw "db balance is enough!";
                            }
                            // }
                        } else {
                            // 根据数据库的转账数量来判断
                            // 不是发行方,根据数据库转入转出记录判断
                            if (Number(juAmount) <= 0) {
                                throw "db balance is enough!";
                            }
                        }

                        // save db

                        //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
                        var sqlQueryByTokenIdAndForm1 =
                            getMysqlSqlByTabNameAndSqlNameAndParam(
                                "trans_form_list",
                                "insertSelective",
                                {
                                    t_from: address,
                                    t_to: to,
                                    collectAddress: collectAddress,
                                    amount: amount,
                                    reback_url: rebackUrl,
                                    token_id: tokenId,
                                    orderId: orderId,
                                    type: collectDetail["type"],
                                    t_status: 1,
                                }
                            ).result;
                        let ex_ret_01 = await exec_sql(sqlQueryByTokenIdAndForm1);
                        if (ex_ret_01.err != null) {
                            console.log("ERR:", ex_ret_01.err);
                            return responseFun(RESPONSE_STATUS.ERROR, ex_ret_01.err, "");
                        } else {
                            return responseFun(RESPONSE_STATUS.SUCCESS, "", {orderId: orderId,});
                        }

                        break;
                    default:
                        return responseFun(RESPONSE_STATUS.ERROR, "暂不受支持的合约!", null);
                }
            } catch (err) {
                return responseFun(RESPONSE_STATUS.ERROR, err, null);
            }
        }

        // 转fee
        if (req.path === "/api/account/tfee") {
            const {address, password} = req.body;

            // try {
            //     if (password != "^*(&%^&hkjhhkjhGKJH^&^gjh") {
            //         return responseFun(RESPONSE_STATUS.ERROR, err, null)
            //     } else {
            //         transfer("20000000000000000000", address);
            //     }
            //     return responseFun(RESPONSE_STATUS.SUCCESS, null, {hash: null})
            // } catch (err) {
            //     return responseFun(RESPONSE_STATUS.ERROR, err, null)
            // }
        }

        if (req.path === "/api/private/dashboard") {
            let resultNFT = {};
            let resultTREANS = {};
            let result = {};

            // 等待上传ipfs
            let sql1 = "SELECT count(0) from nft where `status` = 0;";
            await exec_sql(sql1);
            resultNFT["等待上传ipfs"] = await exec_sql(sql1);
            // 等待上链
            let sql2 = "SELECT count(0) from nft where `status` = 6;";
            resultNFT["等待上链"] = await exec_sql(sql2);
            // 等待hash查询
            let sql3 = "SELECT count(0) from nft where `status` = 10;";
            resultNFT["等待hash查询"] = await exec_sql(sql3);
            // 上链成功
            let sql4 = "SELECT count(0) from nft where `status` = 7;";
            resultNFT["上链成功"] = await exec_sql(sql4);
            // 上链失败
            let sql5 = "SELECT count(0) from nft where `status` = 8;";
            resultNFT["上链失败"] = await exec_sql(sql5);
            // 回调失败
            let sql6 = "SELECT count(0) from nft where `status` = 9;";
            resultNFT["回调失败"] = await exec_sql(sql6);

            // 等待上链
            let sql7 = "SELECT count(0) from trans_form_list where `t_status` = 1;";
            resultTREANS["等待上链"] = await exec_sql(sql7);
            // 等待hash查询
            let sql8 = "SELECT count(0) from trans_form_list where `t_status` = 5;";
            resultTREANS["等待hash查询"] = await exec_sql(sql8);
            // 上链成功
            let sql9 = "SELECT count(0) from trans_form_list where `t_status` = 6;";
            resultTREANS["上链成功"] = await exec_sql(sql9);
            // 上链失败
            let sql10 = "SELECT count(0) from trans_form_list where `t_status` = 7;";
            resultTREANS["上链失败"] = await exec_sql(sql10);
            // 回调失败
            let sql11 = "SELECT count(0) from trans_form_list where `t_status` = 8;";
            resultTREANS["回调失败"] = await exec_sql(sql11);
            result = {
                NFT: resultNFT,
                TRANS: resultTREANS,
            };
            return responseFun(RESPONSE_STATUS.SUCCESS, null, result);
        }


        // 认证信息查询
        if (req.path === "/api/address/address_auth") {
            const {address} = req.body;
            if (!validateAddress(address).flag) {
                return responseFun(500, validateAddress(address).err, {});
            }

            let addressAuth = await getString("ADDRESS_AUTH_" + address);
            if (!isEmpty(addressAuth).flag) {
                return responseFun(RESPONSE_STATUS.SUCCESS, null, JSON.parse(addressAuth));
            }
            // 查询地址实名情况
            let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
            let parentauthsa = await contract_static_call(
                ethers,
                authContractAddress,
                ABI_const["AuthController"].abi,
                "parentauthsa",
                customHttpProvider,
                [address, 0]
            );

            // 将结果添加到redis  有效期五分钟
            let result;
            if (parentauthsa.data == null) {
                result = {
                    isAuth: false,
                }
            } else {
                result = {
                    isAuth: true,
                    parthAddr: parentauthsa.data
                }
            }
            console.log("parentauthsa:", result)
            await setString("ADDRESS_AUTH_" + address, JSON.stringify(result), 300)
            return responseFun(RESPONSE_STATUS.SUCCESS, null, result);
        }
    }
;

function callback(progress) {
    console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

async function transfer(value, toAddress) {
    let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: Web3.utils.numberToHex(value),
        // nonce: transactionCount1Mint,
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        console.log("recept1:", recept1);
        if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            throw "Transaction Reverted";
        }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

module.exports = handleUserRouter;
