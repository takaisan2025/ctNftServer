"use strict";
const {
    getString, setString,
} = require("../redis/redis-client");
const {
    contract_static_call,
} = require("../contract/ChainCall");
const requestIp = require("request-ip");
const {
    validateAddress, isEmpty,
} = require("../rules/rules");
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const {customHttpProvider} = require("../task/taskConst");
const {getPriKey} = require("../chain/accountProUtils");
const {responseFun} = require("../mapper/account");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {authentications} = require("../services/userService");
const pino = require("pino");
const {createAccount} = require("../Orm/AccountService");
const {find_account, auths_single, parentauths_v2, auth_user_v2, auth_user_v1} = require("../services/accountService");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});

let validCardId = (value) => {

    // 只能是18位
    if (!value || value.length !== 18) {
        return false
    }

    // 取出本体码
    const idcard_base = value.substr(0, 17)
    // 取出校验码
    const verify_code = value.substr(17, 1)
    // 加权因子
    const factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    // 校验码对应值
    const verify_code_list = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

    // 根据前17位计算校验码
    let total = 0

    for (let i = 0; i < 17; i++) {
        total += idcard_base.substr(i, 1) * factor[i]
    }
    // 取模
    const mod = total % 11
    // 比较校验码
    return verify_code === verify_code_list[mod];
}

function accountRouters(app) {

    // 创建实名账户
    app.post("/api/account/createUser", async (req, res, next) => {
        let {s_address, s_password, password, expand_data, orderId, card_id} = req.body;

        s_address = Web3.utils.toChecksumAddress(s_address);
        if (!validateAddress(s_address).flag) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, validateAddress(s_address).err, {}));
        }
        if (isEmpty(password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
        }
        if (isEmpty(s_password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
        }
        if (isEmpty(expand_data)) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, "参数为空", {}));
        }

        if (isEmpty(orderId)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "参数错误", {}));
        }

        if (!isEmpty(card_id)) {
            if (!validCardId(card_id)) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "'证件号码输入有误,请重新输入!'", {}));
            }
        }

        // 判断用户名密码
        let result01 = await find_account(s_address);
        if (result01.result == null) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let decWalletResult = await getPriKey(result01.result, s_password);

        if (decWalletResult.err != null) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(PasswordError);
        } else {
            const clientIp = requestIp.getClientIp(req);

            // 判断商家身份
            let authData = await parentauths_v2(s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS);

            if (authData.err != null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {}));
            }

            if (// Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                authData.data.isAuth) {
                // let randomWallet = ethers.Wallet.createRandom();
                // let keystore = await randomWallet.encrypt(password, callback);
                let randomWallet = web3.eth.accounts.create();
                let keystore = await randomWallet.encrypt(password);
                let newVar;
                if (!isEmpty(card_id)) {
                    newVar = await auth_user_v2(randomWallet, card_id, s_address)
                } else {
                    newVar = await auth_user_v1(randomWallet, s_address, expand_data)
                }
                logger.info("create User :%s", JSON.stringify(newVar));

                //    save to db
                let account = {
                    keystore: JSON.stringify(keystore),
                    address: randomWallet.address,
                    status: 1,
                    psd: password,
                    private_key: "",
                    remark: clientIp, // private_key: randomWallet.private_key
                };

                let result = await createAccount(account)
                if (result.err != null) {
                    if (result.result === "order_id must be unique") {
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "OrderId 冲突!", {}));
                    } else {
                        return res
                            .status(RESPONSE_STATUS.SUCCESS)
                            .json(responseFun(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {}));
                    }
                }
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                    keystore: keystore,
                    privateKey: randomWallet.privateKey,
                    publicKey: randomWallet.publicKey,
                    address: randomWallet.address,
                }));
            } else {
                return res
                    .status(RESPONSE_STATUS.SUCCESS)
                    .json(responseFun(RESPONSE_STATUS.ERROR, "s_user信息未认证或者未更新,请稍后重试!", {}));
            }
        }
    });

    // 导入账户实名
    app.post("/api/account/importUser", async (req, res, next) => {
        let {s_address, s_password, private_key, password, expand_data, orderId, card_id} = req.body;

        s_address = Web3.utils.toChecksumAddress(s_address);
        if (!validateAddress(s_address).flag) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, validateAddress(s_address).err, {}));
        }
        if (isEmpty(password)) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(PasswordEmpty);
        }
        if (isEmpty(private_key)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "invalid private_key", {}));
        }
        if (isEmpty(s_password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "invalid s_password", {}));
        }
        if (isEmpty(expand_data)) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, "expand_data参数不能为空", {}));
        }

        if (isEmpty(orderId)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "参数错误", {}));
        }

        if (!validCardId(card_id)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "'证件号码输入有误,请重新输入!'", {}));
        }

        // 判断用户名密码
        let result01 = await find_account(s_address);
        if (result01.result == null) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(ret.keystore).toLowerCase()), password);
        let decWalletResult = await getPriKey(result01.result, s_password);
        let wallet;
        if (decWalletResult.err != null) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(PasswordError);

        } else {
            wallet = decWalletResult.result;

            const clientIp = requestIp.getClientIp(req);

            // 判断商家身份
            let authContractAddress = GlobalConfig.AuthCall;
            let authData = await parentauths_v2(s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS);

            if (authData.err != null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {}));
            }

            if (// Web3.utils.hexToNumberString(authData.data.authLevel) == 1 &&
                authData.data.isAuth) {
                // let randomWallet = ethers.Wallet.createRandom();
                // let keystore = await randomWallet.encrypt(password, callback);
                let randomWallet = new ethers.Wallet(private_key, customHttpProvider);
                let keystore = await randomWallet.encrypt(password);


                let newVar = await auth_user_v2(randomWallet, card_id, s_address);
                logger.info("import User authV2 :%s", JSON.stringify(newVar))

                //    save to db
                let account = {
                    keystore: JSON.stringify(keystore),
                    address: randomWallet.address,
                    status: 1,
                    psd: password,
                    private_key: "",
                    remark: clientIp, // private_key: randomWallet.private_key
                };

                await createAccount(account);
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
                    keystore: keystore,
                    privateKey: randomWallet.privateKey,
                    publicKey: randomWallet.publicKey,
                    address: randomWallet.address,
                }));
            } else {
                return res
                    .status(RESPONSE_STATUS.SUCCESS)
                    .json(responseFun(RESPONSE_STATUS.ERROR, "s_user信息未认证或者未更新,请稍后重试!", {}));
            }
        }
    });

    // 实名账户
    app.post("/api/account/authUser", async (req, res, next) => {
        let {s_address, s_password, address, password, expand_data, orderId, card_id} = req.body;
        s_address = Web3.utils.toChecksumAddress(s_address);
        address = Web3.utils.toChecksumAddress(address);
        if (!validateAddress(s_address).flag) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(RESPONSE_STATUS.ERROR, validateAddress(s_address).err, {});
        }
        if (!validateAddress(address).flag) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, validateAddress(address).err, {}));
        }
        if (isEmpty(password)) {
            res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(PasswordEmpty);
        }
        if (isEmpty(s_password)) {
            res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(PasswordEmpty);
        }
        if (isEmpty(expand_data)) {
            return res
                .status(RESPONSE_STATUS.SUCCESS)
                .json(responseFun(RESPONSE_STATUS.ERROR, "参数错误", {}));
        }

        if (isEmpty(orderId)) {
            return res
                .status(200)
                .json(responseFun(RESPONSE_STATUS.ERROR, "参数错误", {}));
        }

        if (!validCardId(card_id)) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "'证件号码输入有误,请重新输入!'", {}));
        }


        // 判断接入方用户名密码
        let s_ret01 = await find_account(s_address);
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
        } else {
            s_wallet = s_decWalletResult.result;

            // 判断用户密码是否正确
            // 判断接入方用户名密码
            let c_ret01 = await find_account(address);
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
                let authData = await parentauths_v2(s_address, GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS);

                if (authData.err != null) {
                    return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {}));
                }

                if (authData.data.isAuth == true) {
                    let newVar = await auth_user_v2(c_wallet, card_id, s_address);
                    if (newVar.code == 200) {
                        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "请求成功", {
                            s_address: s_address, address: address, orderId: orderId,
                        }));
                    } else {
                        return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, newVar.message, null));
                    }

                } else {
                    return res
                        .status(200)
                        .json(responseFun(RESPONSE_STATUS.ERROR, "s_user信息未认证或者未更新,请稍后重试!", {}));
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
                .json(responseFun(RESPONSE_STATUS.ERROR, validateAddress(address).err, {}));
        }

        if (!validateAddress(s_address).flag) {
            // 判断商家身份
            let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
            let isAuth = await auths_single(address);

            console.log(isAuth);
            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                authData: {
                    isAuth: isAuth.data,
                }, address: address,
            }));
        } else {
            // 判断商家身份
            let authData = await parentauths_v2(address, s_address);

            console.log(authData);
            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                authData: {
                    caddress: authData.data.caddress,
                    sender: authData.data.sender,
                    authTime: Web3.utils.hexToNumberString(authData.data.authTime),
                    authExpiry: Web3.utils.hexToNumberString(authData.data.authExpiry),
                    isAuth: authData.data.isAuth,
                    authLevel: Web3.utils.hexToNumberString(authData.data.authLevel),
                    expandData: authData.data.expandData,
                }, s_address: s_address, address: address,
            }));
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
            keystore: JSON.stringify(keystore),
            address: randomWallet.address,
            status: 1,
            psd: password,
            private_key: "",
            remark: clientIp, // private_key: randomWallet.private_key
        };

        if (isEmpty(password)) {
            return res.status(200).json(PasswordEmpty);
        }

        await createAccount(account);
        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "创建成功", {
            keystore: keystore,
            privateKey: randomWallet.privateKey,
            publicKey: randomWallet.publicKey,
            address: randomWallet.address,
        }));
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

        let result = await find_account(address);

        let isExit = result.result != null;
        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
            address: address, isExit, isCreated: isExit,
        }));
    });

    // 导出账户 (同步)
    app.post("/api/account/exportAccount", async (req, res, next) => {
        const {address, password} = req.body;

        if (isEmpty(password)) {
            return res
                .status(200)
                .json(PasswordEmpty);
        }
        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"

        let ret01 = await find_account(address);
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
            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                address: wallet.address, privateKey: wallet.privateKey,
            }));
        }
    });

    // 认证信息查询
    app.post("/api/address/address_auth", async (req, res, next) => {
        const {address} = req.body;
        if (!validateAddress(address).flag) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, validateAddress(address).err, {}));
        }

        let addressAuth = await getString("ADDRESS_AUTH_" + address);
        if (!isEmpty(addressAuth)) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, null, JSON.parse(addressAuth)));
        }
        let result;
        const milliseconds = Date.now();
        const timestamp = Math.floor(milliseconds / 1000);
        let auth = await authentications(address)
        if (auth && auth.authentications && auth.authentications.length > 0) {
            logger.info("AuthController V2 Query:%s", JSON.stringify(auth.authentications[0].transactionHash))
            let au = auth.authentications[0]
            let isAuth = au.longAuthExpiry > timestamp
            result = {
                isAuth: true,
                isNotExpired: isAuth,
                authExpiryTime: au.longAuthExpiry,
                parthAddr: au.saddress,
                transactionHash: au.transactionHash,
                authTime: au.authTime,
                authExpiry: au.authExpiry,
                expandData: au.expandData,
            }
        } else {
            logger.info("AuthController V1 Query:%s", address)
            // 查询地址实名情况
            let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
            let parentauthsa = await contract_static_call(ethers, authContractAddress, ABI_const["AuthController"].abi, "parentauthsa", customHttpProvider, [address, 0]);

            // 将结果添加到redis  有效期五分钟

            if (parentauthsa.data == null) {
                result = {
                    isAuth: false, isNotExpired: false, authExpiryTime: 0,
                }
            } else {

                let authExpiry = await contract_static_call(ethers, authContractAddress, ABI_const["AuthController"].abi, "auths", customHttpProvider, [address]);
                let authExpiryTime = authExpiry.data.toNumber()
                // 获取当前时间的毫秒级时间戳

// 将毫秒级时间戳转换为秒级时间戳，并使用Math.floor取整

                let isAuth
                if (authExpiryTime === 0 || timestamp > authExpiryTime) {
                    isAuth = false;
                } else {
                    isAuth = true;
                }
                result = {
                    isAuth: true, isNotExpired: isAuth, authExpiryTime: authExpiryTime, parthAddr: parentauthsa.data
                }
            }
            console.log("parentauthsa:", result)
        }

        await setString("ADDRESS_AUTH_" + address, JSON.stringify(result), 300)
        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, null, result));
    })
}

module.exports = accountRouters;
