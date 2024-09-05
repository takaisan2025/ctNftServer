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
    sendCTI,
} = require("./collect");
const {
    validateAddress,
    checkURL,
    isEmpty,
} = require("../rules/rules");
const pino = require("pino");
// const expressPino = require('express-pino-logger');
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
const Web3 = require("web3");
const {customHttpProvider} = require("../task/taskConst");
const {
    queryBalanceAndTokenBalance,
} = require("../chain/balanceQuery");

const {getPriKey} = require("../chain/accountProUtils");

// 非初始化合约地址设置
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {validate} = require("./fcommon");
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ERC1155CtnftOwner = require("../contract/ERC1155CtnftOwner.json");
const {find_account, auths_single} = require("../services/accountService");
const {find_collect} = require("../services/collectService");
const {findCollect} = require("../Orm/CollectService");
const {findTransFormList, findTransFormListAll} = require("../Orm/TransFormListService");

const contractMap = {
    9: ERC721Ctnft,
    10: ERC1155Ctnft,
    12: ERC1155CtnftOwner
};

function transferRouters(app) {
    app.get("/v1/test", async (req, res, next) => {
        let {max} = req.query;
        logger.info("req:%s", max)
        return res.status(RESPONSE_STATUS.SUCCESS).json({max});
    });

    app.post("/v1/test", async (req, res, next) => {
        let {max} = req.body;
        logger.info("req:%s", max)
        return res.status(RESPONSE_STATUS.SUCCESS).json({max});
    });

    // 积分相关接口
    app.post("/api/account/rcti", async (req, res, next) => {
        const {address, password, type, amount} = req.body;
        // 2 注册积分    1  消费积分
        try {
            try {
                //  判断参数是否满足规范
                let ret = await find_account(address);

                if (ret == null) {
                    return res.status(RESPONSE_STATUS.SUCCESS).json(
                        responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
                }

                let decWalletResult = await getPriKey(ret, password);
                validate(decWalletResult.err === null, "invalid password")
                let wallet = decWalletResult.result;
            } catch (err) {
                console.trace(err)
                throw "invalid password";
            }

            let collectResult = await findCollect({
                where: {
                    type: 11
                }
            })

            let collectRet = collectResult.result
            validate(collectRet !== null, "collectAddress is error");
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
            validate(err === null, err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(
                responseFun(RESPONSE_STATUS.SUCCESS, null, {
                    hash: hash,
                    type: type,
                }));
            ;
        } catch (err) {
            console.trace(err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(
                responseFun(RESPONSE_STATUS.ERROR, err, null))
        }
    });

    // 通过个人身份转账接口
    app.post("/api/account/transfer_f", async (req, res, next) => {
        logger.debug("In :%s", new Date().getTime());
        const {address, password, amount, to, tokenId, rebackUrl, orderId} =
            req.body;
        if (isEmpty(password)) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordEmpty);
        }
        let collectAddress;
        try {
            let wallet;
            //  判断参数是否满足规范
            let ret01 = validateAddress(address);
            validate(ret01.flag, ret01.err)

            let ret02 = validateAddress(to);
            validate(ret02.flag, ret02.err)
            // if (address.toLowerCase() == to.toLowerCase()) {
            //     throw  "transfer is owner!"
            // }

            let isDump = await getString(orderId);
            if (isDump == "1") {
                return res.status(RESPONSE_STATUS.SUCCESS).json(
                    responseFun(RESPONSE_STATUS.ERROR, "order_id must be unique", ""));
            }

            // 数据库查询订单号状态
            let ex_orderId_ret = await findTransFormList({
                orderId: orderId
            });
            console.log("ex_orderId_ret:", ex_orderId_ret);
            if (ex_orderId_ret.result != null) {
                console.log("数据库判断订单号冲突!");
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "order_id must be unique", ""));
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
            validate(nftObj !== null, "nft is not exist!")
            logger.debug("Over Query NFT:%s", new Date().getTime());
            let supply = nftObj["supply"];
            collectAddress = nftObj["collectAddress"];

            logger.debug("开始Query Contract:%s", new Date().getTime());
            let collectDetail_ret = await find_collect(nftObj["collectAddress"]);
            if (collectDetail_ret.err != null) {
                console.log("ERR:", collectDetail_ret.err);
            }
            let collectDetail = collectDetail_ret.result;
            let isBal = await getString("BALANCE_" + collectDetail.owner);
            if (isBal == "1") {
                console.log("redis!" + collectDetail.owner);
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "手续费余额不足!", {}));
            }
            logger.debug("Over Query Contract:%s", new Date().getTime());
            validate(collectDetail !== null, "collectAddress is error")

            logger.debug("Start Query Account:%s", new Date().getTime());

            let ret03 = await find_account(address);
            logger.debug("Over Query Account:%s", new Date().getTime());
            let ret = ret03.result;
            if (ret == null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
            }

            let checkURLRet = checkURL(rebackUrl);
            validate(checkURLRet.flag, checkURLRet.err)

            //
            logger.debug("Start dec account:%s", new Date().getTime());
            let decWalletResult = await getPriKey(ret, password);
            logger.debug("Dec Over Query 账户:%s", new Date().getTime());
            if (decWalletResult.err != null) {
                return res.status(RESPONSE_STATUS.SUCCESS).json(PasswordError);
            } else {
                wallet = decWalletResult.result;
            }

            // 查询账户实名状况

            // 判断商家身份
            if (GlobalConfig.CAN_AUTH) {
                if (address != collectDetail.owner) {
                    let isAuth = await auths_single(address);
                    if (isAuth.data != true) {
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}));
                    }
                }
            }

            // 判断合约转账类型
            let contract;
            let transObjFrom;
            let transObjTo;
            let juAmount = 0;

            const contractData = contractMap[collectDetail["type"]];
            if (contractData) {
                contract = new ethers.Contract(
                    collectAddress,
                    contractData.abi, // 10 和 12 是同一个abi
                    customHttpProvider
                );
            } else {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "暂不受支持的合约!", null));
            }

            switch (collectDetail["type"]) {
                case 10:
                case 12:
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
                    validate(balanceRet.err === null, balanceRet.err)
                    let mainBalance = balanceRet.data.balance;
                    let tokenBalance = balanceRet.data.tokenBalance;
                    // 这里如果是合约发行方的话, 做手续费判断   1155协议
                    if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                        if (mainBalance < 50) {
                            await setString("BALANCE_" + address, "1", 60);
                            logger.debug("手续费余额不足:address:%s", address);
                            throw "手续费余额不足";
                        }
                    }

                    if (tokenBalance < amount) {
                        logger.debug("藏品库存不足:address:%s,collectAddress:%s, tokenId:%s,",
                            address,
                            collectAddress,
                            tokenId);
                        throw "藏品库存不足";
                    }
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
                        console.log("ERR_JUDGE:", "order_id must be unique" == ex_ret.err);
                        if ("order_id must be unique" == ex_ret.err) {
                            await setString(orderId, "1", 300);
                        }
                        let isDump = await getString(orderId);
                        console.log("isDump:", isDump);
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, ex_ret.err, ""));
                    } else {
                        logger.debug("Out:%s", new Date().getTime());
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                            orderId: orderId,
                        }));
                    }

                    break;
                case 9:

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
                    let transObjFrom_ret01 = await findTransFormListAll({
                        where: {
                            token_id: tokenId,
                            t_from: address,
                        }, limit: 100
                    })
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
                        validate(supply - juAmount > 0, "db balance is enough!");
                        // }
                    } else {
                        // 根据数据库的转账数量来判断
                        // 不是发行方,根据数据库转入转出记录判断
                        validate(Number(juAmount) > 0, "db balance is enough!");
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
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, ex_ret_01.err, ""));
                    } else {
                        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", {
                            orderId: orderId,
                        }));
                    }

                    break;
            }
        } catch (err) {
            console.trace(err)
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, null));
        }
    });

}

module.exports = transferRouters;
