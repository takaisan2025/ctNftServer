const ABI_const = require("../contract/ABI_const.js");
const ethers = require("ethers");

const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const ethUtil = require("ethereumjs-util");

const {customHttpProvider} = require("./taskConst");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");
const {findAccount} = require("../Orm/AccountService");
const {findNftTransaction, updateNftTransaction} = require("../Orm/NftTransactionService");
const SubmitTransactionTaskFlag = "SubmitTransactionTask_START"

function mightBeJson(str) {
    const regex = /^\{.*\}$|^\[.*\]$/;
    if (str === null) {
        return false
    } else {
        return regex.test(str.trim());
    }
}

async function SubmitTransactionTask() {
    if (await getString(SubmitTransactionTaskFlag) == "1") {
        console.log('===================wait start SubmitTransactionTask')
        return
    } else {
        await setString(SubmitTransactionTaskFlag, "1", 60)
        console.time("SubmitTransactionTask")

        try {

            const nftTransactions = await findNftTransaction(_where = {
                where: {status: 0,},
                offset: 0,
                limit: 500
            });

            if (nftTransactions.code === 0) {
                let transList = nftTransactions.result;

                for (let retKey in transList) {
                    const {
                        id,
                        from, to, data,
                        origin_value,
                        origin_data, method
                    } = transList[retKey].toJSON();
                    try {

                        let sUserAccountDetail01 = await findAccount(_where = {address: from})
                        if (sUserAccountDetail01.code === 0) {
                            let sUserAccountDetail = sUserAccountDetail01.result[0].toJSON()
                            // 直接上链
                            // try {
                            let wallet;

                            let decWalletResult = await getPriKey(sUserAccountDetail, sUserAccountDetail.psd);
                            if (decWalletResult.err != null) {
                                return PasswordError;
                            } else {
                                wallet = decWalletResult.result;
                            }

                            // 这里暂时指定私钥, 后面不能指定
                            let privateKey = wallet.privateKey
                            wallet = new ethers.Wallet(privateKey, customHttpProvider);
                            let methodName = method.split("#")[1]
                            let abiName = method.split("#")[0]

                            // 进行合约交互
                            let contractToken = new ethers.Contract(
                                to,
                                ABI_const[abiName].abi,
                                customHttpProvider
                            );
                            let funData = JSON.parse(origin_data);

                            //  这里做特殊的实名处理
                            if (mightBeJson(origin_value)) {
                                let origin_value_json = JSON.parse(origin_value)
                                funData[0].authLevel = 8;
                                funData[0].expandData = `0x${ethUtil
                                    .keccak256(Buffer.from(`${origin_value_json.name}#${origin_value_json.id}#${origin_value_json.mobile}`))
                                    .toString("hex")}`;
                            }

                            let contractWithSignerToken = contractToken.connect(wallet);
                            let gasLimitRet = await contractWithSignerToken.estimateGas[methodName](
                                ...funData
                            ).then((ret) => {
                                return {err: null, gasLimit: ret}
                            }).catch((err) => {
                                return {err: err.reason, gasLimit: null}
                            });
                            if (gasLimitRet.err != null) {

                                console.trace(gasLimitRet.err);
                                // console.log(minted721TokenStr == gasLimitRet.err)
                                let trans_from_obj = {
                                    status: 2, // 上链失败
                                    id: id,
                                    vm_err: gasLimitRet.err
                                };
                                console.log("nftUpdateSelective:", trans_from_obj);
                                await updateNftTransaction(_params = trans_from_obj, _where = {where: {id: id}})
                                continue;

                            } else {
                                let gasLimitA = gasLimitRet.gasLimit

                                let txCallRet = await contractWithSignerToken[methodName](
                                    ...funData,
                                    {
                                        // The maximum units of gas for the transaction to use
                                        // gasLimit: web3.utils.numberToHex(gasLimitA),
                                        // The price (in wei) per unit of gas
                                        // gasPrice: web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                                        // The nonce to use in the transaction
                                        // nonce: nonce,
                                        // The amount to send with the transaction (i.e. msg.value)
                                        // value: utils.parseEther('1.0'),
                                        // The chain ID (or network ID) to use
                                        // chainId: 27
                                    }
                                ).then((ret) => {
                                    return {err: null, data: ret};
                                })
                                    .catch((err) => {
                                        console.trace("err:", err.reason);
                                        return {err: err.reason, data: null};
                                    });
                                tx = txCallRet.data;
                                // console.log("txRet:", txRet);
                                // console.log("txTransForm:", tx);
                                if (txCallRet.err == null) {
                                    // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                                    // save db
                                    let trans_from_obj = {
                                        hash: tx.hash,
                                        status: 1, // 上链成功
                                        id: id
                                    };
                                    console.log("nftUpdateSelective:", trans_from_obj);

                                    let result02 = await updateNftTransaction(_params = trans_from_obj, _where = {where: {id: id}},)
                                    if (result02.err != null) {
                                        console.trace(responseFun(500, result02.err, ""), id);
                                        continue;
                                    }
                                    console.log("update TransFrom data:", result02.result);
                                    continue;
                                } else {
                                    if ("execution reverted: ERC1155: insufficient balance for transfer" == txCallRet.err) {
                                        let trans_from_obj = {
                                            t_status: 3, // 上链成功
                                            id: id
                                        };
                                        console.log("nftUpdateSelective:", trans_from_obj);
                                        await updateNftTransaction(_params = trans_from_obj, _where = {where: {id: id}},)
                                        continue;
                                    }
                                    if ("ErrFunds must less than 0.105 ETH" == txCallRet.err) {
                                        // 计算手续费导致的错误, 稍后重试
                                        continue;
                                    }
                                    if ("ErrFunds must less than 0.105 ETH" == txCallRet.err) {
                                        // 计算手续费导致的错误, 稍后重试
                                        continue;
                                    }
                                    if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                                        // 计算手续费导致的错误, 稍后重试
                                        let trans_from_obj = {
                                            t_status: 6, // 上链成功
                                            id: id
                                        };

                                        await updateNftTransaction(_params = trans_from_obj, _where = {where: {id: id}},)
                                        continue;
                                    }
                                    if ("replacement fee too low" == txCallRet.err) {
                                        //手续费不足
                                        continue;
                                    }
                                    //手续费不足
                                    console.trace("txCallRet.err", txCallRet.err);
                                    continue;

                                }
                                continue;
                            }
                        } else {
                            console.error(sUserAccountDetail01.result)
                            console.trace(sUserAccountDetail01.result)
                            continue;
                        }


                    } catch
                        (e) {
                        console.error(e)
                        console.trace(e)
                        continue;
                    }

                }
                await removeString(SubmitTransactionTaskFlag)
                console.timeEnd("SubmitTransactionTask");

            } else {
                console.log("操作失败！\n" + error);
                console.trace("ERR:", error);
                return error;
            }


        } catch (error) {
            console.log("操作失败！\n" + error);
            console.trace("ERR:", error);
            return error;
        }
    }
}

// SubmitTransactionTask()
module.exports = {
    SubmitTransactionTask
};
