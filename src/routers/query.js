const {
    nftSelectSelective,
    exec_sql,
} = require("../controller/ctnft");
const ethers = require("ethers");
const Web3 = require("web3");

const {
    queryBalanceAndTokenBalance,
} = require("../chain/balanceQuery");

// 非初始化合约地址设置
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {RESPONSE_STATUS} = require("../chain/responseError");

async function dashFun(sql) {
    return (await exec_sql(sql)).result['count(0)']
}

function queryRouters(app) {

    // 查询和批量查询
    app.post("/api/account/queryNft", async (req, res, next) => {
        const {tokenIds} = req.body;
        const result = nftSelectSelective(tokenIds);
        return result
            .then((ret) => {
                return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "", ret));
            })
            .catch((err) => {
                return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, err, ""));
            });
    })

    // 查询 transaction
    app.post("/api/account/queryTransaction", async (req, res, next) => {
        const {orderId} = req.body;

        // 这里首先查询链上, 链上不存在再查询数据库
        var sqlQueryByOrderId = get_mysql(
            "trans_form_list",
            "selectByOrderId",
            {
                orderId: orderId,
            }
        ).result;
        let ex_orderId_ret = await exec_sql(sqlQueryByOrderId);
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

            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                from: ex_orderId_ret.result.t_from,
                to: ex_orderId_ret.result.t_to,
                amount: ex_orderId_ret.result.amount,
                token_id: ex_orderId_ret.result.token_id,
                orderId: ex_orderId_ret.result.orderId,
                hash: ex_orderId_ret.result.hash,
                collectAddress: ex_orderId_ret.result.collectAddress,
                status: ex_orderId_ret.result.t_status,
                statusDesc: statusDesc,
            }));
        } else {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, "订单不存在!", ""));
        }
    })

    // 查询 余额
    app.post("/api/account/queryAccountBalance", async (req, res, next) => {
        const {tokenId, address, collectAddress} = req.body;

        var balanceRet = await queryBalanceAndTokenBalance(
            address,
            collectAddress,
            tokenId
        );
        if (balanceRet.err != null) {
            return res.status(200).json(responseFun(RESPONSE_STATUS.ERROR, (balanceRet.err, {})));
        } else {
            let mainBalance = ethers.utils.formatEther(
                Web3.utils.hexToNumberString(balanceRet.data.balance)
            );
            let tokenBalance = Web3.utils.hexToNumberString(
                balanceRet.data.tokenBalance
            );

            return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                balance: mainBalance,
                tokenBalance: tokenBalance,
            }));
        }
    })

    // 回调  TODO 这个可能需要考虑是否需要回调
    app.post("/api/account/callFun", async (req, res, next) => {
        return res.status(200).json({code: 0});
    })

    app.post("/api/private/dashboard", async (req, res, next) => {
        let resultNFT = {};
        let resultTREANS = {};
        let result = {};

        // 等待上传ipfs
        let sql1 = "SELECT count(0) from nft where `status` = 0;";
        await dashFun(sql1);
        resultNFT["等待上传ipfs"] = await dashFun(sql1);
        // 等待上链
        let sql2 = "SELECT count(0) from nft where `status` = 6;";
        resultNFT["等待上链"] = await dashFun(sql2);
        // 等待hash查询
        let sql3 = "SELECT count(0) from nft where `status` = 10;";
        resultNFT["等待hash查询"] = await dashFun(sql3);
        // 上链成功
        let sql4 = "SELECT count(0) from nft where `status` = 7;";
        resultNFT["上链成功"] = await dashFun(sql4);
        // 上链失败
        let sql5 = "SELECT count(0) from nft where `status` = 8;";
        resultNFT["上链失败"] = await dashFun(sql5);
        // 回调失败
        let sql6 = "SELECT count(0) from nft where `status` = 9;";
        resultNFT["回调失败"] = await dashFun(sql6);

        // 等待上链
        let sql7 = "SELECT count(0) from trans_form_list where `t_status` = 1;";
        resultTREANS["等待上链"] = await dashFun(sql7);
        // 等待hash查询
        let sql8 = "SELECT count(0) from trans_form_list where `t_status` = 5;";
        resultTREANS["等待hash查询"] = await dashFun(sql8);
        // 上链成功
        let sql9 = "SELECT count(0) from trans_form_list where `t_status` = 6;";
        resultTREANS["上链成功"] = await dashFun(sql9);
        // 上链失败
        let sql10 = "SELECT count(0) from trans_form_list where `t_status` = 7;";
        resultTREANS["上链失败"] = await dashFun(sql10);
        // 回调失败
        let sql11 = "SELECT count(0) from trans_form_list where `t_status` = 8;";
        resultTREANS["回调失败"] = await dashFun(sql11);
        result = {
            NFT: resultNFT,
            TRANS: resultTREANS,
        };

        return res.status(200).json(responseFun(RESPONSE_STATUS.SUCCESS, null, result));
    })
}

module.exports = queryRouters;
