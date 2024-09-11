"use strict"
const ABI_const = require("../contract/ABI_const.js");
const ethers = require("ethers");
const pino = require("pino");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const {
    getString,
    setString,
    removeString,
    getKeys,
} = require("../redis/redis-client");
const {Op} = require('sequelize')
const {customHttpProvider} = require("./taskConst");
const {responseFun} = require("../mapper/account");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");
const {findAccount} = require("../Orm/AccountService");
const {findNftTransaction, updateNftTransaction} = require("../Orm/NftTransactionService");
const GlobalConfig = require("../config/GlobalConfig.json");
const {transferOutline} = require("./transferOutline");
const SubmitTransactionTaskFlag = "SubmitTransactionTask_START"
const TransactionHashQueryTaskFlag = "TransactionHashQueryTask_START"
const Web3 = require("web3");
let web3 = new Web3(GlobalConfig.BLOCK_CHAIN.RPC_URL[1].url);

// 创建一个Provider（你可以连接到一个特定的以太坊节点，或使用默认的Infura/Alchemy等）

// 获取账户的 nonce
async function getNonce(address) {
    let nonce = await getString(address + '_NONCE');
    if (Number(nonce) > 0) {
        nonce = Number(nonce) + 1;
        await setString(address + '_NONCE', nonce, 4)  // 5s

    } else {
        nonce = await customHttpProvider.getTransactionCount(address, "latest");
        console.log(address + "Nonce:", nonce);
        await setString(address + '_NONCE', nonce, 4)  // 5s
    }

    return nonce;
}
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

            let newVar = await getKeys("BALANCE_*");

            let andfrom = [];
            for (let newVarElement of newVar) {
                let stringAddress = newVarElement.split('BALANCE_')[1];
                andfrom.push(stringAddress)
            }

            const nftTransactions = await findNftTransaction({
                where: {
                    status: 0,
                    from: {
                        [Op.not]: andfrom
                    }
                },
                offset: 0,
                limit: 500
            });

            if (nftTransactions.err === null) {
                let transList = nftTransactions.result;

                for (let retKey in transList) {
                    const {
                        id,
                        from, to, data,
                        value,
                        origin_value,
                        origin_data, method
                    } = transList[retKey];

                    let isBal = await getString("BALANCE_" + from);
                    if (isBal == "1") {
                        break;
                    }
                    try {

                        let wallet;
                        if (GlobalConfig.FEE_ACCOUNT.address.toLowerCase() === from.toLowerCase()) {
                            wallet = new ethers.Wallet(GlobalConfig.FEE_ACCOUNT.private_key, customHttpProvider);
                        } else {
                            let sUserAccountDetail01 = await findAccount({address: from})
                            if (sUserAccountDetail01.err === null) {
                                let sUserAccountDetail = sUserAccountDetail01.result
                                // 直接上链
                                let decWalletResult = await getPriKey(sUserAccountDetail, sUserAccountDetail.psd);
                                // 这里暂时指定私钥, 后面不能指定
                                let privateKey = decWalletResult.result.privateKey
                                wallet = new ethers.Wallet(privateKey, customHttpProvider);
                            } else {
                                console.error(sUserAccountDetail01.result)
                                console.trace(sUserAccountDetail01.result)
                                continue;
                            }
                        }

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
                        // if (mightBeJson(origin_value)) {
                        //     let origin_value_json = JSON.parse(origin_value)
                        //     funData[0].authLevel = 8;
                        //     funData[0].expandData = `0x${ethUtil
                        //         .keccak256(Buffer.from(`${origin_value_json.name}#${origin_value_json.id}#${origin_value_json.mobile}`))
                        //         .toString("hex")}`;
                        // }

                        let contractWithSignerToken = contractToken.connect(wallet);
                        let gasLimitRet = await contractWithSignerToken.estimateGas[methodName](
                            ...funData,
                            {
                                // The maximum units of gas for the transaction to use
                                // gasLimit: Web3.utils.numberToHex(gasLimitA),
                                // The price (in wei) per unit of gas
                                // gasPrice: Web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                                // The nonce to use in the transaction
                                // nonce: nonce,
                                gasPrice: Web3.utils.numberToHex(4800e9),
                                // The amount to send with the transaction (i.e. msg.value)
                                value: ethers.utils.parseEther(value),
                                // The chain ID (or network ID) to use
                                // chainId: 27
                            }
                        ).then((ret) => {
                            return {err: null, gasLimit: ret}
                        }).catch((err) => {
                            console.trace(err)
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
                            await updateNftTransaction(trans_from_obj, {where: {id: id}})
                            continue;

                        } else {
                            let gasLimitA = gasLimitRet.gasLimit
                            let nonce = await getNonce(wallet.address)
                            let txCallRet = await contractWithSignerToken[methodName](
                                ...funData,
                                {
                                    // The maximum units of gas for the transaction to use
                                    // gasLimit: Web3.utils.numberToHex(gasLimitA),
                                    // The price (in wei) per unit of gas
                                    // gasPrice: Web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                                    // The nonce to use in the transaction
                                    nonce: nonce,
                                    gasPrice: Web3.utils.numberToHex(4800e9),
                                    // The amount to send with the transaction (i.e. msg.value)
                                    value: ethers.utils.parseEther(value),
                                    // The chain ID (or network ID) to use
                                    // chainId: 27
                                }
                            ).then((ret) => {
                                return {err: null, data: ret};
                            })
                                .catch(async (err) => {
                                    console.trace("err:", err.reason);

                                    if (err.reason === 'cannot estimate gas; transaction may fail or may require manual gas limit') {
                                        await setString("BALANCE_" + from, "1", 60);
                                        logger.debug("手续费余额不足:address:%s", from);
                                    }

                                    return {err: err.reason, data: null};
                                });
                            let tx = txCallRet.data;
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

                                let result02 = await updateNftTransaction(trans_from_obj, {where: {id: id}},)

                                if (result02.err != null) {
                                    console.trace(responseFun(RESPONSE_STATUS.ERROR, result02.err, ""), id);
                                    continue;
                                }

                                if (funData[0].authLevel && funData[0].authLevel == 8) {
                                    await transferOutline(funData[0].caddress, '30')
                                }

                                console.log("update TransFrom data:", result02.result);
                                continue;
                            } else {
                                let trans_from_obj;
                                switch (txCallRet.err) {
                                    case "execution reverted: ERC1155: insufficient balance for transfer":
                                        trans_from_obj = {
                                            status: 2, // 上链失败
                                            id: id,
                                            vm_err: gasLimitRet.err
                                        };
                                        console.log("nftUpdateSelective:", trans_from_obj);
                                        await updateNftTransaction(trans_from_obj, {where: {id: id}},)
                                        continue;
                                    case "ErrFunds must less than 0.105 ETH":
                                        // 计算手续费导致的错误, 稍后重试
                                        continue;
                                    case "execution reverted: order has been processed!":
                                        // 计算手续费导致的错误, 稍后重试
                                        trans_from_obj = {
                                            t_status: 6, // 上链成功
                                            id: id
                                        };

                                        await updateNftTransaction(trans_from_obj, {where: {id: id}},)

                                        if (funData[0].authLevel && funData[0].authLevel == 8) {
                                            await transferOutline(funData[0].caddress, '30')
                                        }

                                        continue;
                                    case "replacement fee too low":
                                        //手续费不足
                                        continue;
                                    default:
                                        //手续费不足
                                        console.trace("txCallRet.err", txCallRet.err);
                                }
                            }
                        }
                    } catch
                        (e) {
                        console.error(e)
                        console.trace(e)

                    }

                }
            }
            await removeString(SubmitTransactionTaskFlag)
            console.timeEnd("SubmitTransactionTask");
        } catch (error) {
            await removeString(SubmitTransactionTaskFlag)
            console.log("操作失败！\n" + error);
            console.trace("ERR:", error);
            return error;
        }
    }
}



async function TransactionHashQueryTask() {
    if (await getString(TransactionHashQueryTaskFlag) == "1") {
        console.log('===================wait start TransactionHashQueryTask')
        return
    } else {
        await setString(TransactionHashQueryTaskFlag, "1", 60)
        console.time("TransactionHashQueryTask")

        try {

            // 示例使用：
            const date = new Date('2024-09-01');
            const nftTransactions = await findNftTransaction({
                where: {
                    status: 1,
                    create_time: {
                        [Op.gte]: date
                    }
                },
                offset: 0,
                limit: 500
            });

            if (nftTransactions.err === null) {
                let transList = nftTransactions.result;

                for (let retKey in transList) {
                    const {
                        id, hash, update_time
                    } = transList[retKey];

                    if (!hash || hash === "" || hash == null) {
                        continue;
                    }

                    try {

                        let recept = await web3.eth.getTransactionReceipt(hash);
                        let currTime = new Date().getTime();
                        if (currTime - update_time.getTime() < 10000) {   // hash产生不到10s自动跳过
                            continue;
                        } else {
                            let t_statusStorage;
                            if (recept != null && recept.status == true) {
                                t_statusStorage = 3;
                            } else {

                                // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                                // save db
                                // if (recept.data.transaction == null || recept.data.transaction.status == null) {
                                if (currTime - update_time.getTime() < 60000) {
                                    continue;
                                } else {
                                    t_statusStorage = 0;
                                    console.log("查询hash结果false,", hash);
                                }
                            }

                            let trans_from_obj = {
                                status: t_statusStorage, // 6 成功,7 失败
                                id: id
                            };
                            console.log("nftUpdateSelective:", trans_from_obj);

                            let paramsUp = trans_from_obj;

                            console.log("nftUpdateSelective:", trans_from_obj);
                            if (t_statusStorage == 3) {
                                await updateNftTransaction(trans_from_obj, {where: {id: id}})
                            }
                            continue;
                        }
                    } catch (e) {
                        console.error(e)
                        console.trace(e)
                        continue;
                    }
                }
            }
            await removeString(TransactionHashQueryTaskFlag)
            console.timeEnd("TransactionHashQueryTask");
        } catch (error) {
            await removeString(TransactionHashQueryTaskFlag)
            console.log("操作失败！\n" + error);
            console.trace("ERR:", error);
            return error;
        }
    }
}

// SubmitTransactionTask()
// TransactionHashQueryTask()
module.exports = {
    SubmitTransactionTask,
    TransactionHashQueryTask
};
