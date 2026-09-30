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
const {customHttpProvider, getWeb3} = require("./taskConst");
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
const {updateNft} = require("../Orm/NftService");
const {sendAtPendingNonce} = require("../chain/signedOrderSender");
const {hasReservedTransferNonce} = require("../chain/transferNonceReservation");
const {setLock, renewLock, releaseLock} = require("../redis/redis-client");
const nonceLocks = {setLock, renewLock, releaseLock};
let web3 = new Web3(GlobalConfig.BLOCK_CHAIN.RPC_URL[1].url);

function mightBeJson(str) {
    const regex = /^\{.*\}$|^\[.*\]$/;
    if (str === null) {
        return false
    } else {
        return regex.test(str.trim());
    }
}

// 判断地址是否在数组中
function isAddressInArray(address) {
    // 定义地址数组，存储为 ethers.js 的 Address 类型
    const addressArray = [
        ethers.utils.getAddress('0x8549E5003BdAdEFA095C8759E2B981D0Cb2e472B'),
        ethers.utils.getAddress('0x709bBc0aD7581D02244E00C356d0EFcbC79AE9f3')
    ];

    // 将传入的地址标准化（转换为 checksum 地址）
    const targetAddress = ethers.utils.getAddress(address);

    // 遍历地址数组并比较
    for (let addr of addressArray) {
        if (addr === targetAddress) {
            return true;
        }
    }
    return false;
}

async function SubmitTransactionTask() {
    if (await getString(SubmitTransactionTaskFlag) == "1") {
        console.log('===================wait start SubmitTransactionTask')
        return
    } else {

        try {
            await setString(SubmitTransactionTaskFlag, "1", 60)
            console.time("SubmitTransactionTask")

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
                        value, type,
                        origin_value, remark,
                        origin_data, method
                    } = transList[retKey];

                    let isBal = await getString("BALANCE_" + from);
                    if (isBal == "1") {
                        break;
                    }

                    let maxPriorityFeePerGas;

                    if (isAddressInArray(to)) {
                        console.log("地址存在于实名数组中");
                        maxPriorityFeePerGas = Web3.utils.numberToHex(1);
                    } else {
                        console.log("地址不在实名数组中");
                        maxPriorityFeePerGas = Web3.utils.numberToHex(4500e9);
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
                                maxFeePerGas: Web3.utils.numberToHex(4800e9),
                                maxPriorityFeePerGas: maxPriorityFeePerGas,

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
                            if (type === 1 && to.toLowerCase() === "0x8549E5003BdAdEFA095C8759E2B981D0Cb2e472B".toLowerCase()) {
                                if (funData.length === 4) {
                                    trans_from_obj = {
                                        ...trans_from_obj,
                                        remark: funData[3]
                                    }
                                }
                            }
                            console.log("nftUpdateSelective:", trans_from_obj);
                            await updateNftTransaction(trans_from_obj, {where: {id: id}})
                            continue;

                        } else {
                            let gasLimitA = gasLimitRet.gasLimit
                            let txCallRet = await sendAtPendingNonce({
                                locks: nonceLocks,
                                provider: customHttpProvider,
                                address: from,
                                hasReservation: nonce => hasReservedTransferNonce(from, nonce),
                                send: nonce => contractWithSignerToken[methodName](
                                    ...funData,
                                    {
                                    // The maximum units of gas for the transaction to use
                                    // gasLimit: Web3.utils.numberToHex(gasLimitA),
                                    // The price (in wei) per unit of gas
                                    // gasPrice: Web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                                    // The nonce to use in the transaction
                                    nonce: nonce,
                                    maxFeePerGas: Web3.utils.numberToHex(4800e9),
                                    maxPriorityFeePerGas: maxPriorityFeePerGas,
                                    // The amount to send with the transaction (i.e. msg.value)
                                    value: ethers.utils.parseEther(value),
                                    // The chain ID (or network ID) to usem
                                    // chainId: 27
                                    }
                                )
                            }).then((ret) => {
                                return ret.action === "sent"
                                    ? {err: null, data: ret.tx}
                                    : {err: ret.action, data: null};
                            })
                                .catch(async (err) => {
                                    console.trace("err:", err.reason);

                                    if (err.reason === 'cannot estimate gas; transaction may fail or may require manual gas limit') {
                                        // await setString("BALANCE_" + from, "1", 60);
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
                                if (type === 1 && to.toLowerCase() === "0x8549E5003BdAdEFA095C8759E2B981D0Cb2e472B".toLowerCase()) {
                                    if (funData.length === 4) {
                                        trans_from_obj = {
                                            ...trans_from_obj,
                                            remark: funData[3]
                                        }
                                    }
                                }

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
                                        if (type === 1 && to.toLowerCase() === "0x8549E5003BdAdEFA095C8759E2B981D0Cb2e472B".toLowerCase()) {
                                            if (funData.length === 4) {
                                                trans_from_obj = {
                                                    ...trans_from_obj,
                                                    remark: funData[3]
                                                }
                                            }
                                        }
                                        console.log("nftUpdateSelective:", trans_from_obj);
                                        await updateNftTransaction(trans_from_obj, {where: {id: id}},)
                                        continue;
                                    case "ErrFunds must less than 0.105 ETH":
                                        // 计算手续费导致的错误, 稍后重试
                                        continue;
                                    case "execution reverted: order has been processed!":
                                        // 计算手续费导致的错误, 稍后重试
                                        trans_from_obj = {
                                            status: 6, // 上链成功
                                            id: id
                                        };
                                        if (type === 1 && to.toLowerCase() === "0x8549E5003BdAdEFA095C8759E2B981D0Cb2e472B".toLowerCase()) {
                                            if (funData.length === 4) {
                                                trans_from_obj = {
                                                    ...trans_from_obj,
                                                    remark: funData[3]
                                                }
                                            }
                                        }
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

        } catch (error) {
            console.log("操作失败！\n" + error);
            console.trace("ERR:", error);
            return error;
        } finally {
            await removeString(SubmitTransactionTaskFlag)
            console.timeEnd("SubmitTransactionTask");
        }
    }
}

async function getReceiptsBatch(hashes) {
    let _web3 = getWeb3()
    const batch = new _web3.BatchRequest();
    const promises = hashes.map(hash =>
        new Promise((resolve, reject) => {
            batch.add(_web3.eth.getTransactionReceipt.request(hash, (err, receipt) => {
                if (err) reject(err);
                else resolve({hash, receipt});
            }));
        })
    );
    batch.execute();
    return Promise.all(promises);
}

async function TransactionHashQueryTask() {
    if (await getString(TransactionHashQueryTaskFlag) === "1") {
        console.log('===================wait start TransactionHashQueryTask')
    } else {

        try {
            await setString(TransactionHashQueryTaskFlag, "1", 60)
            console.time("TransactionHashQueryTask")

            // 示例使用：
            const date = new Date('2025-04-20');
            const transList_ret = await findNftTransaction({
                where: {
                    status: 1,
                    create_time: {
                        [Op.gte]: date
                    }
                },
                order: [['id', 'ASC']],
                offset: 0,
                limit: 15
            });

            if (transList_ret.err) {
                console.trace("ERR:", transList_ret.err);
                return;
            }

            let currTime = new Date().getTime();
            const transList = transList_ret.result.filter(tx => {
                const timeDiff = currTime - tx.update_time.getTime();
                return timeDiff >= 10000 && tx.hash && tx.hash !== "" && tx.hash != null;
            });

            const hashes = transList.map(tx => tx.hash);
            const results = await getReceiptsBatch(hashes);
            let updates = [];
            results.forEach(({hash, receipt}, idx) => {
                // if (!receipt) return;

                if (receipt != null) {
                    let t_statusStorage = receipt.status === true ? 3 : 0;
                    console.log("currTime - transList[idx].update_time.getTime():", currTime - transList[idx].update_time.getTime())
                    if (t_statusStorage === 0 && currTime - transList[idx].update_time.getTime() >= 30000) {
                        updates.push({id: transList[idx].id, status: t_statusStorage});
                    } else if (t_statusStorage !== 0) {
                        updates.push({id: transList[idx].id, status: t_statusStorage});
                    }
                } else {
                    if (currTime - transList[idx].update_time.getTime() >= 30000) {
                        let t_statusStorage = 0
                        updates.push({id: transList[idx].id, status: t_statusStorage});
                    }
                }
            });
            console.log("updates:", updates)
            // await Promise.all(updates.map(update => updateTransFormList(update, {id: update.id})));
            await Promise.all(updates.map(update => updateNftTransaction(update, {where: {id: update.id}})));

        } catch (error) {
            console.log("操作失败！\n" + error);
            console.trace("ERR:", error);
            return error;
        } finally {
            await removeString(TransactionHashQueryTaskFlag)
            console.timeEnd("TransactionHashQueryTask");
        }
    }
}

// SubmitTransactionTask()
// TransactionHashQueryTask()
module.exports = {
    SubmitTransactionTask,
    TransactionHashQueryTask
};
