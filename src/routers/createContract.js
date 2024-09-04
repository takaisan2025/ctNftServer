"use strict";
const {
    createCollectV2,
    createCollectV2Call,
    collectInit,
    collectInitCall,
} = require("./collect");
const {
    isJson,
    validateAddress,
    isEmpty,
} = require("../rules/rules");
const ethers = require("ethers");
const ABI_const = require("../contract/ABI_const.js");
const {customHttpProvider} = require("../task/taskConst");
const {getPriKey} = require("../chain/accountProUtils");
const pino = require("pino");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
// 非初始化合约地址设置
const ERC721CtnftExample = "0x0F4b3B9EcfD11444cB139dB98DB9aB0Ec417705E";
const ERC1155CtnftExample = "0xeB3AD009272D6C5f045f3d5EaD0ef0e47930877d";
const ERC1155CtnftOwnerExample = "0xbE23EBD6fC9b07945251382A8db82C477ddd5683";
let collectAddressExample = {
    9: ERC721CtnftExample,
    10: ERC1155CtnftExample,
    12: ERC1155CtnftOwnerExample,
};
let gasPrice = "4800000000000";
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {validate} = require("./fcommon");
const {find_account} = require("../services/accountService");
const {insert_collect} = require("../services/collectService");

function createContractRouters(app) {

    //创建收藏夹
    app.post("/api/account/createctCollect", async (req, res, next) => {
        // 创建表单解析对象
        try {
            const {address, password, cMetadata, type} = req.body;
            //  判断参数是否满足规范
            if (isEmpty(password)) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
            }

            let ret01 = validateAddress(address);
            validate(ret01.flag, ret01.err);

            let ret02 = isJson(cMetadata);
            validate(ret02.flag, ret02.err);

            if (JSON.stringify(cMetadata).indexOf("{") == -1) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "invalid paramter data", {}));
            }

            // 判断实名
            // 这里好像不需要判断实名, 因为这里一般都是项目方调用, 不会有手续费垫付的情况发生
            let ret03 = await find_account(address);

            let ret = ret03.result;
            if (ret == null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
            }

            validate(ret.psd === password, "invalid password");
            validate(cMetadata.tokenUrlPrefix, "invalid tokenUrlPrefix");
            validate(cMetadata.tokenUrlPrefix.endsWith("/"), "invalid tokenUrlPrefix endsWith /");

            let wallet;

            let decWalletResult = await getPriKey(ret, password);
            if (decWalletResult.err != null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordError);
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
                logger.debug("createCollectV2Call faild");
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
            }
            if (errInit != null) {
                logger.debug("createCollectV2Call faild");
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, errInit, {}));
            }
            //    赠送合约手续费
            let neceliby = ethers.utils.formatEther((gasPrice * gaslimit).toString());
            let necelibyInit = ethers.utils.formatEther(
                (gasPrice * gaslimitInit).toString()
            );
            logger.debug("neceliby*:%s", neceliby);
            logger.debug("necelibyInit*:%s", necelibyInit);
            logger.debug("gaslimitInit:%s", gaslimitInit);
            let necelibyTotal = Number(neceliby) + Number(necelibyInit);
            let balance = await wallet.provider.getBalance(address);
            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
            let etherString = ethers.utils.formatEther(balance);
            logger.debug("Balance: %s", etherString);
            // 计算初始化合约费用
            logger.debug("judge balance enough:%s", Number(balance) < Number(necelibyTotal));
            if (Number(etherString) < Number(necelibyTotal)) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "账户余额不足!", {}));
            }
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
            // if (collectAddress == null) {return res.status(RESPONSE_STATUS.SUCCESS).json( responseFun(RESPONSE_STATUS.ERROR,  "创建合约失败", {}));
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
                logger.debug("txTransfer faild");
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, result1.err, {}));
            }
            const contractMap = {
                10: "ERC721Ctnft",
                12: "ERC1155CtnftOwner",
                9: "ERC1155Ctnft",
                1: "CtnftMToken"
            };

            const contractName = contractMap[type] ? ABI_const[contractMap[type]].contractName : "";

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

            let ret04 = await insert_collect(collect);
            if (ret04.err == null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                    collectAddress,
                    type,
                    hash: result1.hash,
                }));
            } else {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, ret04.err, {}));
            }
        } catch (err) {
            console.trace(err)
            logger.debug(err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, {}));
        }
    });
}

module.exports = createContractRouters;
