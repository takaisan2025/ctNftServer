const {
    getString,
    setString,
} = require("../redis/redis-client");
const EIP712 = require("./EIP712");
const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
const {
    exec_sql,
} = require("../controller/ctnft");
const {
    contract_static_call,
} = require("../contract/ChainCall");
const requestIp = require("request-ip");
const {
    validateAddress,
    isEmpty,
} = require("../rules/rules");
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
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

const {getPriKey} = require("../chain/accountProUtils");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");

function accountRouters(app) {

    app.get("/v1/test", async (req, res, next) => {
        let {max} = req.query;
        return res.status(200).json({max});
    });

    app.post("/v1/test", async (req, res, next) => {
        console.log(req.body);
        let {max} = req.body;
        console.log(max);
        return res.status(200).json({max});
    });

    // 创建实名账户
    app.post("/api/account/createUser", async (req, res, next) => {
        let {s_address, s_password, password, expand_data, orderId} = req.body;

        s_address = Web3.utils.toChecksumAddress(s_address);
        if (!validateAddress(s_address).flag) {
            return res
                .status(200)
                .json(responseFun(500, validateAddress(s_address).err, {}));
        }
        if (isEmpty(password).flag) {
            return res.status(200).json(PasswordEmpty);
        }
        if (isEmpty(s_password).flag) {
            return res.status(200).json(PasswordEmpty);
        }
        if (isEmpty(expand_data).flag) {
            return res
                .status(200)
                .json(responseFun(500, isEmpty(expand_data).err, {}));
        }

        if (isEmpty(orderId).flag) {
            return res.status(200).json(responseFun(500, isEmpty(orderId).err, {}));
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
            return res
                .status(200)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let decWalletResult = await getPriKey(result01.result, s_password);
        let wallet;
        if (decWalletResult.err != null) {
            return res
                .status(200)
                .json(PasswordError);
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
                return res.status(200).json(responseFun(500, "操作失败,请重试!", {}));
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
                        return res.status(200).json(responseFun(500, "OrderId 冲突!", {}));
                    } else {
                        return res
                            .status(200)
                            .json(responseFun(500, "操作失败,请重试!", {}));
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
                return res.status(200).json(
                    responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                        keystore: keystore,
                        privateKey: randomWallet.privateKey,
                        publicKey: randomWallet.publicKey,
                        address: randomWallet.address,
                    })
                );
            } else {
                return res
                    .status(200)
                    .json(responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {}));
            }
        }
    });

    // 导入账户实名
    app.post("/api/account/importUser", async (req, res, next) => {
        let {s_address, s_password, private_key, password, expand_data, orderId} =
            req.body;

        s_address = Web3.utils.toChecksumAddress(s_address);
        if (!validateAddress(s_address).flag) {
            return res
                .status(200)
                .json(responseFun(500, validateAddress(s_address).err, {}));
        }
        if (isEmpty(password).flag) {
            return res
                .status(200)
                .json(PasswordEmpty);
        }
        if (isEmpty(private_key).flag) {
            return res.status(200).json(responseFun(500, "invalid private_key", {}));
        }
        if (isEmpty(s_password).flag) {
            return res.status(200).json(responseFun(500, "invalid s_password", {}));
        }
        if (isEmpty(expand_data).flag) {
            return res
                .status(200)
                .json(responseFun(500, isEmpty(expand_data).err, {}));
        }

        if (isEmpty(orderId).flag) {
            return res.status(200).json(responseFun(500, isEmpty(orderId).err, {}));
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
            return res
                .status(200)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let decWalletResult = await getPriKey(result01.result, s_password);
        let wallet;
        if (decWalletResult.err != null) {
            return res
                .status(200)
                .json(PasswordError);
            ;
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
                return res.status(200).json(responseFun(500, "操作失败,请重试!", {}));
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
                        return res.status(200).json(responseFun(500, "OrderId 冲突!", {}));
                    } else {
                        return res
                            .status(200)
                            .json(responseFun(500, "操作失败,请重试!", {}));
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
                return res.status(200).json(
                    responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                        keystore: keystore,
                        privateKey: randomWallet.privateKey,
                        publicKey: randomWallet.publicKey,
                        address: randomWallet.address,
                    })
                );
            } else {
                return res
                    .status(200)
                    .json(responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {}));
            }
        }
    });

    // 实名账户
    app.post("/api/account/authUser", async (req, res, next) => {
        let {s_address, s_password, address, password, expand_data, orderId} =
            req.body;
        s_address = Web3.utils.toChecksumAddress(s_address);
        address = Web3.utils.toChecksumAddress(address);
        if (!validateAddress(s_address).flag) {
            return res.status(200).json(500, validateAddress(s_address).err, {});
        }
        if (!validateAddress(address).flag) {
            return res
                .status(200)
                .json(responseFun(500, validateAddress(address).err, {}));
        }
        if (isEmpty(password).flag) {
            res
                .status(200)
                .json(PasswordEmpty);
        }
        if (isEmpty(s_password).flag) {
            return
            res
                .status(200)
                .json(PasswordEmpty);
        }
        if (isEmpty(expand_data).flag) {
            return res
                .status(200)
                .json(responseFun(500, isEmpty(expand_data).err, {}));
        }

        if (isEmpty(orderId).flag) {
            return res
                .status(200)
                .json(responseFun(500, isEmpty(expand_data).err, {}));
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
            return res
                .status(200)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let s_decWalletResult = await getPriKey(s_ret01.result, s_password);
        let s_wallet;
        if (s_decWalletResult.err != null) {
            return res
                .status(200)
                .json(PasswordError);
            ;
        } else {
            s_wallet = s_decWalletResult.result;

            // 判断用户密码是否正确
            // 判断接入方用户名密码
            let c_sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                address: address,
            });
            let c_ret01 = await exec_sql(c_sqlResult.result);
            if (c_ret01.result == null) {
                return res
                    .status(200)
                    .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
            }

            // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
            let c_decWalletResult = await getPriKey(c_ret01.result, password);
            let c_wallet;
            if (c_decWalletResult.err != null) {
                return res
                    .status(200)
                    .json(PasswordError);
                ;
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
                    return res.status(200).json(responseFun(500, "操作失败,请重试!", {}));
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
                            return res
                                .status(200)
                                .json(responseFun(500, "OrderId 冲突!", {}));
                        } else {
                            return res
                                .status(200)
                                .json(responseFun(500, "操作失败,请重试!", {}));
                        }
                    }
                    return res.status(200).json(
                        responseFun(RESPONSE_STATUS.SUCCESS, "请求成功", {
                            s_address: s_address,
                            address: address,
                            orderId: orderId,
                        })
                    );
                } else {
                    return res
                        .status(200)
                        .json(
                            responseFun(500, "s_user信息未认证或者未更新,请稍后重试!", {})
                        );
                }
            }
        }
    });

    // 查询实名账户
    app.post("/api/account/queryAuthUser", async (req, res, next) => {
        const {s_address, address} = req.body;

        if (!validateAddress(address).flag) {
            return res
                .status(200)
                .json(responseFun(500, validateAddress(address).err, {}));
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
            return res.status(200).json(
                responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    authData: {
                        isAuth: isAuth.data,
                    },
                    address: address,
                })
            );
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
            return res.status(200).json(
                responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
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
                })
            );
        }
    });

    // 创建账户
    app.post("/api/account/createAccount", async (req, res, next) => {
        const {password} = req.body;

        // const inputValidation = passwordSchema.validate(password);
        // if (inputValidation.error) next(inputValidation.error.message);
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
            return res.status(200).json(PasswordEmpty);
        }

        let sqlResult = get_mysql("AccountMapper", "insert", account);
        let result = await exec_sql(sqlResult.result);
        return res.status(200).json(
            responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                keystore: keystore,
                privateKey: randomWallet.privateKey,
                publicKey: randomWallet.publicKey,
                address: randomWallet.address,
            })
        );
    });

    // 查询庄户注册状态
    app.post("/api/account/checkAccount", async (req, res, next) => {
        const {address} = req.body;
        //
        //  判断参数是否满足规范
        let {err, flag} = validateAddress(address);
        if (!flag) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }

        let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
            address: address,
        });
        let result = await exec_sql(sqlResult.result);
        console.log(result);

        let isExit = result.result != null;
        return res.status(200).json(
            responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                address: address,
                isExit,
                isCreated: isExit,
            })
        );
    });

    // 导出账户 (同步)
    app.post("/api/account/exportAccount", async (req, res, next) => {
        const {address, password} = req.body;

        if (isEmpty(password).flag) {
            return res
                .status(200)
                .json(PasswordEmpty);
        }
        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
        let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
            address: address,
        });
        let ret01 = await exec_sql(sqlResult.result);
        if (ret01.result == null) {
            return res
                .status(200)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let decWalletResult = await getPriKey(ret01.result, password);
        let wallet;
        if (decWalletResult.err != null) {
            return res
                .status(200)
                .json(PasswordError);
            ;
        } else {
            wallet = decWalletResult.result;
            return res.status(200).json(
                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                })
            );
        }
    });

    // 认证信息查询
    app.post("/api/address/address_auth", async (req, res, next) => {
        const {address} = req.body;
        if (!validateAddress(address).flag) {
            return res.status(200).json(responseFun(500, validateAddress(address).err, {}));
        }

        let addressAuth = await getString("ADDRESS_AUTH_" + address);
        if (!isEmpty(addressAuth).flag) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, null, JSON.parse(addressAuth)));
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
        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, null, result));
    })
}

module.exports = accountRouters;
