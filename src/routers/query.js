"use strict";
const ethers = require("ethers");
const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");

const {
    queryBalanceAndTokenBalance,
} = require("../chain/balanceQuery");

// 非初始化合约地址设置
const {responseFun} = require("../mapper/account");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findTransFormListOne} = require("../Orm/TransFormListService");
const {find_nfts, count_nft} = require("../services/nftService");
const {count_trans} = require("../services/transFormListService");
const {setString} = require("../redis/redis-client");
const {apolloClient} = require("../apollo");
const {TransferDocument} = require("../generated/graphql");

function queryRouters(app) {

    // 查询和批量查询
    app.post("/api/account/queryNft", async (req, res, next) => {
        const {tokenIds} = req.body;
        const result = find_nfts(tokenIds);
        return result
            .then((ret) => {
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "", ret.result));
            })
            .catch((err) => {
                console.trace(err)
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, err, ""));
            });
    })

    // 查询 transaction
    app.post("/api/account/queryTransaction", async (req, res, next) => {
        const {orderId} = req.body;

        // 这里首先查询链上, 链上不存在再查询数据库
        let ex_orderId_ret = await findTransFormListOne({
            where: {
                orderId: orderId,
            },
        })

        // console.log("betchTransferThread", sql)
        if (ex_orderId_ret.err != null) {
            console.trace("ERR:", ex_orderId_ret.result);
        }

        if (ex_orderId_ret.result != null) {
            let statusDesc = '';
            switch (ex_orderId_ret.result.t_status) {
                case 8:
                    statusDesc = '初次回调失败'
                    break
                case 18:
                    statusDesc = '最终回调失败'
                    break
                case 4:
                    statusDesc = '回调成功'
                    break
                case 6:
                    statusDesc = '等待回调'
                    break
                case 3:
                    statusDesc = '交易上链失败'
                    break
                default:
                    statusDesc = '等待处理'
                    break
            }

            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                from: ex_orderId_ret.result.t_from,
                to: ex_orderId_ret.result.t_to,
                amount: ex_orderId_ret.result.amount,
                token_id: ex_orderId_ret.result.token_id,
                orderId: ex_orderId_ret.result.orderId,
                hash: ex_orderId_ret.result.hash,
                collectAddress: ex_orderId_ret.result.collectAddress,
                status: ex_orderId_ret.result.t_status,
                statusDesc: statusDesc,
                vmErr: ex_orderId_ret.result.vm_err,
            }));
        } else {
            // 数据库查询结果为空


            let orderIdEcc = `0x${ethUtil
                .keccak256(Buffer.from(orderId))
                .toString("hex")}`;

            let transData = await apolloClient().query({
                query: TransferDocument,
                variables: {id: orderIdEcc}
            })
                .then(response => {
                    return {
                        'data': response.data
                    }
                })
                .catch(error => {
                    return {
                        'err': error
                    }
                });

            if (transData.err == undefined) {
                if (transData.data && Array.isArray(transData.data.transfers) == true && transData.data.transfers.length > 0) {
                    //     子图有结果
                    let tokenDec = BigInt(transData.data.transfers[0].tokenId).toString(16)

                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                        from: transData.data.transfers[0].from,
                        to: transData.data.transfers[0].to,
                        amount: Number(transData.data.transfers[0].value),
                        token_id: "0x" + tokenDec,
                        orderId: orderId,
                        hash: transData.data.transfers[0].transactionHash,
                        collectAddress: transData.data.transfers[0].token,
                        status: 4,
                        statusDesc: '回调成功',
                        vmErr: null,
                    }));
                } else {
                    //     子图没有结果
                    return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "订单不存在!", ""));
                }
            } else {
                // 子图查询报错
                return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, "订单查询错误!", ""));
            }
        }
    })

    // 查询 余额
    app.post("/api/account/queryAccountBalance", async (req, res, next) => {
        const {tokenId, address, collectAddress, type} = req.body;

        var balanceRet = await queryBalanceAndTokenBalance(
            address,
            collectAddress,
            tokenId,
            type
        );
        if (balanceRet.err != null) {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.ERROR, (balanceRet.err, {})));
        } else {
            return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                balance: balanceRet.data.balance,
                tokenBalance: balanceRet.data.tokenBalance,
            }));
        }
    })

    // 回调  TODO 这个可能需要考虑是否需要回调
    app.post("/api/account/callFun", async (req, res, next) => {
        return res.status(RESPONSE_STATUS.SUCCESS).json({code: 0});
    })

    app.post("/api/private/dashboard", async (req, res, next) => {
        let resultNFT = {};
        let resultTREANS = {};
        let result = {};

        // 等待上传ipfs
        resultNFT["等待上传ipfs"] = await count_nft(0);
        // 等待上链
        resultNFT["等待上链"] = await count_nft(6);
        // 等待hash查询
        resultNFT["等待hash查询"] = await count_nft(10);
        // 上链成功
        resultNFT["上链成功"] = await count_nft(7);
        // 上链失败
        resultNFT["上链失败"] = await count_nft(8);
        // 回调失败
        resultNFT["回调失败"] = await count_nft(9);

        // 等待上链
        resultTREANS["等待上链"] = await count_trans(1);
        // 等待hash查询
        resultTREANS["等待hash查询"] = await count_trans(5);
        // 上链成功
        resultTREANS["上链成功"] = await count_trans(6);
        // 上链失败
        resultTREANS["上链失败"] = await count_trans(3);
        resultTREANS["HASH失败"] = await count_trans(7);
        // 回调失败
        resultTREANS["回调失败"] = await count_trans(8);
        result = {
            NFT: resultNFT,
            TRANS: resultTREANS,
        };

        return res.status(RESPONSE_STATUS.SUCCESS).json(responseFun(RESPONSE_STATUS.SUCCESS, null, result));
    })
}

module.exports = queryRouters;
