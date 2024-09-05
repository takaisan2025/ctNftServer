"use strict";
const {
    getString,
    setString,
} = require("../redis/redis-client");

const {
    exec_sql,
} = require("../controller/ctnft");
const {
    contract_static_call,
} = require("../contract/ChainCall");

const {
    isJson,
    validateAddress,
    checkURL,
    isEmpty,
} = require("../rules/rules");

const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
const {customHttpProvider} = require("../task/taskConst");
const {getPriKey} = require("../chain/accountProUtils");

const {responseFun} = require("../mapper/account");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {validate} = require("./fcommon");
const pino = require("pino");
const {find_account, auths_single} = require("../services/accountService");
const {find_collect} = require("../services/collectService");
const {createNft} = require("../Orm/NftService");
const {queryBalance} = require("../chain/balanceQuery");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});

function mintRouters(app) {

    // 异步铸造721接口
    app.post("/api/account/createctNftAsync", async (req, res, next) => {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, rebackUrl} =
            req.body;
        if (isEmpty(password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
        }
        try {
            //  判断参数是否满足规范
            let ret01 = validateAddress(address);
            validate(ret01.flag, ret01.err);

            let ret02 = validateAddress(collectAddress);
            validate(ret02.flag, ret02.err);

            let ret03 = isJson(data);
            validate(ret03.flag, ret03.err);

            let checkURLRet = checkURL(rebackUrl);
            validate(checkURLRet.flag, checkURLRet.err);

            let checkURLRet1 = checkURL(file);
            validate(checkURLRet1.flag, checkURLRet1.err);
        } catch (e) {
            console.trace(e)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, e, {}));
        }

        //  判断参数是否满足规范
        let ret04 = await find_account(address);

        let ret = ret04.result;
        if (ret == null) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // 判断账户余额
        let collectDetail01 = await find_collect(collectAddress);

        if (collectDetail01.err != null) {
            console.trace("ERR:", err);
        }
        if (collectDetail01.result == null) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "没有找到匹配的合约信息!", {}));
        }

        let collectDetail = collectDetail01.result;

        // 查询账户实名状况

        let isBal = await getString("BALANCE_" + collectDetail.owner);
        if (isBal === "1") {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
        }

        // 判断商家身份
        if (GlobalConfig.CAN_AUTH) {
            if (address != collectDetail.owner) {
                let isAuth = await auths_single(address);
                if (isAuth.data != true) {
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}));
                }
            }
        }

        let wallet;
        // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
        let decWalletResult = await getPriKey(ret, password);
        validate(decWalletResult.err === null, PasswordError);
        wallet = decWalletResult.result;
        wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
        let etherString = await queryBalance(collectDetail.owner);
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        logger.debug("Balance: %s", etherString);
        // 计算初始化合约费用
        if (Number(etherString) < Number(10)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
        }

        try {
            // 查询合约基本信息  type   == 10
            let collectRet02 = await find_collect(collectAddress);
            let collectRet = collectRet02.result;
            validate(collectRet !== null, "collectAddress is not fund")
            validate(collectRet.type === 9, "collectAddress type is not 721")
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            const tokenId = address + "c1234567890" + Date.now();

            // 创建目录
            // 写入文件
            var originalFilename = file.substring(file.lastIndexOf("/") + 1);

            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"

            //    暂时插入数据库
            let nft = {
                address,
                collectAddress,
                isFinish: 0,
                premetadata: JSON.stringify(data),
                status: 0, // 未上架
                tokenId: tokenId,
                owner: address,
                creator: address,
                fileName: originalFilename,
                tempPath: file,
                tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                nonce: "0",
                rebackUrl: rebackUrl,
            };

            // 插入数据库
            // Get SQL Statement
            return await createNft(nft)
                .then((ret) => {
                    // return ret;
                    // fileUploadIpfs();
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                        tokenId,
                    }));
                })
                .catch((err) => {
                    console.trace(err)
                    logger.debug("ERR:%s", err);
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                });
        } catch (err) {
            console.trace(err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }
    });

    // 批量铸造
    app.post("/api/account/createctNft1155Async", async (req, res, next) => {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, supply, rebackUrl} =
            req.body;
        let {} = req.body;
        if (isEmpty(password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
        }
        try {
            //  判断参数是否满足规范
            let ret01 = validateAddress(address);
            validate(ret01.flag, ret01.err);

            let ret02 = validateAddress(collectAddress);
            validate(ret02.flag, ret02.err);

            let ret03 = isJson(data);
            validate(ret03.flag, ret03.err);

            let checkURLRet = checkURL(rebackUrl);
            validate(checkURLRet.flag, checkURLRet.err)

            let checkURLRet1 = checkURL(file);
            validate(checkURLRet1.flag, checkURLRet1.err)
        } catch (e) {
            console.trace(e)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, e, {}));
        }
        if (supply < 1) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "supply 必须大于0", {}));
        }
        // if (supply >= 100000) {
        //     return responseFun(RESPONSE_STATUS.ERROR,  "supply must less than 100000", {});
        // }

        //  判断参数是否满足规范
        let ret002 = await find_account(address);

        //
        if (ret002.result == null) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }
        let wallet;
        // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
        let decWalletResult = await getPriKey(ret002.result, password);
        if (decWalletResult.err != null) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordError);
        } else {
            wallet = decWalletResult.result;
        }

        try {
            // 查询合约基本信息  type   == 10

            // 查询账户实名状况
            let collectRet02 = await find_collect(collectAddress);
            if (collectRet02.err != null) {
                logger.debug("ERR:%s", collectRet02.err);
            }
            let collectRet = collectRet02.result;
            validate(collectRet !== null, "collectAddress is not fund")
            validate(collectRet.type === 10 || collectRet.type === 12, "collectAddress type is not 721")
            let isBal = await getString("BALANCE_" + collectRet.owner);
            if (isBal == "1") {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
            }
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
            let etherString = await queryBalance(collectRet.owner);
            logger.debug("Balance: %s", etherString);
            if (Number(etherString) < Number(10)) {
                await setString("BALANCE_" + collectRet.owner, "1", 60);  // 2 min
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
            }

            // 查询账户实名状况

            // 判断商家身份
            if (GlobalConfig.CAN_AUTH) {
                if (address != collectRet.owner) {
                    let isAuth = await auths_single(address);
                    if (isAuth.data != true) {
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}));
                    }
                }
            }
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            const tokenId = address + "c1234567890" + Date.now();

            var originalFilename = file.substring(file.lastIndexOf("/") + 1);

            //    暂时插入数据库
            let nft = {
                address,
                isFinish: 0,
                premetadata: JSON.stringify(data),
                status: 0, // 未上架
                supply,
                collectAddress,
                tokenId: tokenId,
                owner: address,
                creator: address,
                fileName: originalFilename,
                tempPath: file,
                tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
                nonce: "0",
                rebackUrl: rebackUrl,
            };

            // 插入数据库
            // Get SQL Statement

            return await createNft(nft)
                .then((ret) => {
                    // fileUploadIpfs();
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                        tokenId,
                    }));
                })
                .catch((err) => {
                    console.trace(err)
                    logger.debug("ERR:%s", err);
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err.code, {}));
                });
        } catch (err) {
            console.trace(err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }
    });

}

module.exports = mintRouters;
