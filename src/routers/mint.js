const {
    getString,
    setString,
} = require("../redis/redis-client");

const {
    exec_sql,
    nftSelectSelectiveCreator,
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


const pino = require("pino");
const xss = require("xss");
const ethers = require("ethers");
const fetch = require("node-fetch");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const {customHttpProvider} = require("../task/taskConst");
const {getPriKey} = require("../chain/accountProUtils");

const fs = require("fs");
const path = require("path");

const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");

/**
 * 判断目录是否存在，不存在则创建
 * { recursive: true } 表示多层目录时递归创建
 */
function createDir(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {recursive: true});
    }
}

function mintRouters(app) {

    // 异步铸造721接口
    app.post("/api/account/createctNftAsync", async (req, res, next) => {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, rebackUrl} =
            req.body;
        if (isEmpty(password).flag) {
            return res.status(200).json(PasswordEmpty);
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
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, e, {}));
        }

        //  判断参数是否满足规范
        let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
            address: address,
        });
        let ret04 = await exec_sql(sqlResult.result);

        let ret = ret04.result;
        if (ret == null) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }

        // 判断账户余额
        var params1 = {address: collectAddress};
        var sql1 = get_mysql("collect", "selectByAddress", params1).result;
        let collectDetail01 = await exec_sql(sql1);

        if (collectDetail01.err != null) {
            console.trace("ERR:", err);
        }
        if (collectDetail01.result == null) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "没有找到匹配的合约信息!", {}));
        }

        let collectDetail = collectDetail01.result;

        // 查询账户实名状况

        let isBal = await getString("BALANCE_" + collectDetail.owner);
        if (isBal == "1") {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
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
                    return res.status(200).json(responseFun(500, "用户信息未认证或过期,请稍后重试!", {}));
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
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
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
                premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
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
            var sql = get_mysql("nft", "insertSelective", nft).result;
            return await exec_sql(sql)
                .then((ret) => {
                    // return ret;
                    // fileUploadIpfs();
                    return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                        tokenId,
                    }));
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                });
        } catch (err) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }
    });

    // 批量铸造
    app.post("/api/account/createctNft1155Async", async (req, res, next) => {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, supply, rebackUrl} =
            req.body;
        let {} = req.body;
        if (isEmpty(password).flag) {
            return res.status(200).json(PasswordEmpty);
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
            return;
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, e, {}));
        }
        if (supply < 1) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "supply 必须大于0", {}));
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
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
        }
        let wallet;
        // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
        let decWalletResult = await getPriKey(ret002.result, password);
        if (decWalletResult.err != null) {
            return res.status(200).json(PasswordError);
        } else {
            wallet = decWalletResult.result;
        }

        try {
            // 查询合约基本信息  type   == 10

            var params = {address: collectAddress};
            var sql = get_mysql("collect", "selectByAddress", params).result;

            // 查询账户实名状况


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

            let isBal = await getString("BALANCE_" + collectRet.owner);
            if (isBal == "1") {
                return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
            }
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
            let balance = await wallet.provider.getBalance(collectRet.owner);
            let etherString = ethers.utils.formatEther(balance);
            console.log("Balance: ", etherString);
            if (Number(etherString) < Number(10)) {
                await setString("BALANCE_" + collectRet.owner, "1", 120);  // 2 min
                return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {}));
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
                        return res.status(200).json(responseFun(500, "用户信息未认证或过期,请稍后重试!", {}));
                    }
                }
            }
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            const tokenId = address + "c1234567890" + Date.now();

            var originalFilename = file.substring(file.lastIndexOf("/") + 1);

            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            let retNft = await nftSelectSelectiveCreator(address)
                .then((retNft) => {
                    return retNft;
                })
                .catch((err) => {
                    return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
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
                    return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                        tokenId,
                    }));
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err.code, {}));
                });
        } catch (err) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }
    });

}

module.exports = mintRouters;
