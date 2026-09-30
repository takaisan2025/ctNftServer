const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
const {
    getString,
    setString, getKeys, setLock, renewLock, releaseLock,
} = require("../redis/redis-client");

const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
let CtTransferExecutorAddress = GlobalConfig.CtTransferExecutorAddress;
const ethers = require("ethers");

const ethUtil = require("ethereumjs-util");
const {responseFunStr} = require("../mapper/account");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");

const betchTransferFlag = "betchTransfer_START";

const {id_fun, getCustomHttpProvider} = require("./taskConst");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findTransFormListAll, updateTransFormList} = require("../Orm/TransFormListService");
const {Op} = require('sequelize')
const {findAccount} = require("../Orm/AccountService");
const {findCollect} = require("../Orm/CollectService");
const {auth_user_v1, auth_user_v2, auths_single, auths_idHash} = require("../services/accountService");
const {queryBalance} = require("../chain/balanceQuery");
const {withLease} = require("../redis/withLease");
const {submitSignedOrder, sendAtPendingNonce} = require("../chain/signedOrderSender");
const {chooseNonce} = require("../chain/nonceManager");
const {hasReservedTransferNonce} = require("../chain/transferNonceReservation");
const {TRANSFER_MAX_FEE_PER_GAS, transferFundingDeficit} = require("../chain/gasFunding");
const {fillNonceGap} = require("../chain/gapFiller");

// 创建一个Provider（你可以连接到一个特定的以太坊节点，或使用默认的Infura/Alchemy等）

const nonceLocks = {setLock, renewLock, releaseLock};

async function  betchTransfer() {
    const lease = await withLease(nonceLocks, betchTransferFlag, async assertHeld => {
        let customHttpProvider = getCustomHttpProvider()
        console.time("betchTransfer")
        try {
        let newVar = await getKeys("BALANCE_*");

        let andfrom = [];
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }

        let transList_ret = await findTransFormListAll(_param = {
            where: {
                t_status: 1,
                t_from: {
                    [Op.not]: andfrom
                },
                collectAddress: {
                    [Op.not]: andfrom
                }
            },
            offset: 0,
            limit: 200,
        })

        // console.log("betchTransferThread", sql)
        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.result);
        }
        transList = transList_ret.result;
        for (let retKey in transList) {
            await assertHeld();
            const {
                id,
                t_from,
                t_to,
                amount,
                reback_url,
                token_id,
                type,
                orderId,
                collectAddress,
                t_status,
                create_time,
                update_time,
                hash: previousHash,
                nonce: previousNonce
            } = transList[retKey];
            // TODO 待完成
            // await lpop("TRANSFER_F")
            let submittedHash;
            let gapNonce;
            try {
                if (await getString("BALANCE_" + t_from) === "1") continue;
                if (previousHash && previousNonce != null) {
                    const previous = await chooseNonce(customHttpProvider, t_from,
                        {hash: previousHash, nonce: previousNonce});
                    if (previous.action === "in-flight") {
                        await updateTransFormList({t_status: 5}, {id, t_status: 1});
                        continue;
                    }
                    if (previous.action === "mined-success") {
                        await updateTransFormList({t_status: 6}, {id, t_status: 1});
                        continue;
                    }
                    if (previous.action === "earlier-gap") {
                        gapNonce = previous.nonce;
                    } else if (previous.action !== "send") {
                        console.log("Transfer deferred:", id, previous.action);
                        continue;
                    }
                }
                let accountDetail_ret01 = await findAccount({address: t_from})
                let accountDetail = accountDetail_ret01.result

                let collectDetail_ret02 = await findCollect({address: collectAddress})

                if (collectDetail_ret02.err != null) {
                    console.trace("ERR:", collectDetail_ret02.result);
                }

                let collectDetail = collectDetail_ret02.result

                // console.log(collectDetail)

                let contractAddressDetailAsync;
                if (collectDetail.owner.toLowerCase() == t_from.toLowerCase()) {
                    contractAddressDetailAsync = accountDetail;
                } else {
                    let contractAddressDetailAsync_ret = await findAccount({address: collectDetail.owner});
                    contractAddressDetailAsync = contractAddressDetailAsync_ret.result
                }
                let contractAddressDetail = contractAddressDetailAsync;

                let isBal = await getString("BALANCE_" + contractAddressDetail.address)
                if (isBal == "1" && gapNonce == null) {
                    console.log("合约草田分余额不足:", contractAddressDetail.address)
                    continue;
                }

                let decWalletResult1 = await getPriKey(contractAddressDetailAsync, contractAddressDetailAsync.psd);
                let wallet1;
                if (decWalletResult1.err != null) {
                    return PasswordError;
                } else {
                    wallet1 = decWalletResult1.result;
                }
                contractAddressDetail.private_key = wallet1.privateKey;
                if (new ethers.Wallet(wallet1.privateKey).address.toLowerCase() !==
                    contractAddressDetail.address.toLowerCase()) {
                    throw new Error(`Transfer sponsor key mismatch: ${id}`);
                }
                let accountItem = accountDetail;
                // try {
                let wallet;

                let decWalletResult = await getPriKey(accountItem, accountItem.psd);
                if (decWalletResult.err != null) {
                    return PasswordError;
                } else {
                    wallet = decWalletResult.result;
                }
                wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
                if (wallet.address.toLowerCase() !== t_from.toLowerCase()) {
                    throw new Error(`Transfer account key mismatch: ${id}`);
                }

                if (gapNonce != null) {
                    if (await hasReservedTransferNonce(t_from, gapNonce, id, true)) continue;
                    const balance = await customHttpProvider.getBalance(t_from, "pending");
                    const deficit = transferFundingDeficit(21000, balance);
                    if (!deficit.isZero()) {
                        if (contractAddressDetail.address.toLowerCase() === t_from.toLowerCase()) {
                            await setString("BALANCE_" + t_from, "1", 60);
                        } else {
                            const funding = await transfer(contractAddressDetail.private_key, deficit, t_from, wallet);
                            if (funding.err) console.log("Gap fill funding failed:", id, funding.err);
                            else {
                                await setString("BALANCE_" + t_from, "1", 60);
                                console.log("Gap fill funded:", id, funding.hash);
                            }
                        }
                        continue;
                    }
                    const filler = await fillNonceGap({
                        locks: nonceLocks, provider: customHttpProvider, wallet,
                        nonce: gapNonce,
                        hasReservation: nonce => hasReservedTransferNonce(t_from, nonce, id, true),
                        persist: record => setString(
                            `GAP_FILL:${t_from.toLowerCase()}`, JSON.stringify(record))
                    });
                    console.log("Nonce gap fill:", id, gapNonce, filler.action,
                        filler.tx && filler.tx.hash);
                    continue;
                }


                // 使用Provider 连接合约，将只有对合约的可读权限
                let transferTo = t_to;

                // 链上余额判断
                let etherString = await queryBalance(t_from);

                // TODO 首先需要判断授权 ApproveAll
                let contractToken = new ethers.Contract(
                    collectAddress,
                    ERC1155Ctnft.abi,
                    customHttpProvider
                );
                let contractWithSignerToken = contractToken.connect(wallet);

                let isApprovedForAll = await contractWithSignerToken.isApprovedForAll(
                    t_from,
                    CtTransferExecutorAddress
                );
                console.log("isApprovedForAll:", isApprovedForAll);
                if (  // 判断是否是项目方
                    contractAddressDetail.address.toLowerCase() == t_from.toLowerCase() && Number(etherString) < Number(String(10))
                ) {

                    await setString("BALANCE_" + contractAddressDetail.address, "1", 60)
                    await setString("BALANCE_" + collectAddress, "1", 60)
                    // 跳出, 重新查询数据
                    console.log("草田分余额不足:", contractAddressDetail.address)
                    continue;
                } else {
                    let etherStringC = await queryBalance(contractAddressDetail.address.toLowerCase());
                    if (Number(etherStringC) < Number(String(10))) {
                        await setString("BALANCE_" + contractAddressDetail.address, "1", 60)
                        await setString("BALANCE_" + collectAddress, "1", 60)
                        // 跳出, 重新查询数据
                        console.log("草田分余额不足:", contractAddressDetail.address)
                        break;
                    }
                }

                if (isApprovedForAll == false) {
                    // 进行授权
                    let gasLimitRet = await contractWithSignerToken.estimateGas
                        .setApprovalForAll(
                            CtTransferExecutorAddress,
                            true
                        )
                        .then((ret) => {
                            return {err: null, gasLimit: ret}
                        })
                        .catch((err) => {
                            console.trace(err)
                            return {err: err.reason, gasLimit: null}
                        });
                    if (gasLimitRet.err != null) {
                        continue;
                    }
                    const approvalBalance = await customHttpProvider.getBalance(t_from, "pending");
                    const approvalDeficit = transferFundingDeficit(gasLimitRet.gasLimit, approvalBalance);
                    if (!approvalDeficit.isZero()) {
                        if (contractAddressDetail.address.toLowerCase() === t_from.toLowerCase()) {
                            await setString("BALANCE_" + t_from, "1", 60);
                            continue;
                        }
                        const funding = await transfer(contractAddressDetail.private_key, approvalDeficit, t_from, wallet);
                        if (funding.err) {
                            console.log("Approval gas funding failed:", id, funding.err);
                        } else {
                            await setString("BALANCE_" + t_from, "1", 60);
                            console.log("Approval gas funded:", id, funding.hash);
                        }
                        continue;
                    }

                    const approval = await sendAtPendingNonce({
                        locks: nonceLocks,
                        provider: customHttpProvider,
                        address: t_from,
                        hasReservation: nonce => hasReservedTransferNonce(t_from, nonce),
                        send: nonce => contractWithSignerToken.setApprovalForAll(
                            CtTransferExecutorAddress,
                            true,
                            {
                                nonce,
                                maxFeePerGas: TRANSFER_MAX_FEE_PER_GAS.toHexString(),
                                maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9)
                            }
                        )
                    });
                    if (approval.action !== "sent") continue;
                    continue;
                    // let recept1 = await customHttpProvider.waitForTransaction(txApproveRet.hash);
                    //
                    // console.log("txApprove:", recept1);

                }

                // 如果没有授权, 需要先授权
                let contract = new ethers.Contract(
                    CtTransferExecutorAddress,
                    CtTransferExecutor.abi,
                    customHttpProvider
                );

                // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
                let contractWithSigner = contract.connect(wallet);
                //safeTransferFrom(from, to, data.tokenId, transfer, "");

                let assetClass;
                if (type == 9) {
                    assetClass = id_fun("ERC721");
                } else if (type == 10 || type == 12) {
                    assetClass = id_fun("ERC1155");
                } else {
                    continue;
                }

                let transferDirection = assetClass;
                let transferType = assetClass;
                let orderIdEcc = `0x${ethUtil
                    .keccak256(Buffer.from(orderId))
                    .toString("hex")}`;
                let data = orderIdEcc;
                let gasLimitRet = await contractWithSigner.estimateGas
                    .transfer(
                        assetClass,
                        collectAddress,
                        t_from,
                        transferTo,
                        token_id,
                        orderIdEcc,
                        amount,
                        transferDirection,
                        transferType,
                        data
                    )
                    .then((ret) => {
                        return {err: null, gasLimit: ret}
                    })
                    .catch((err) => {
                        console.log("Err:", err)
                        return {err: err.reason, gasLimit: null}
                    });
                if (gasLimitRet.err != null) {
                    console.trace(gasLimitRet.err);
                    if ("execution reverted: ERC1155: insufficient balance for transfer" == gasLimitRet.err ||
                        "execution reverted: ERC1155: burn amount exceeds balance" == gasLimitRet.err ||
                        "execution reverted: ERC1155: transfer to non ERC1155Receiver implementer" == gasLimitRet.err ||
                        "execution reverted: ERC721: transfer caller is not owner nor approved" == gasLimitRet.err
                    ) {
                        let trans_from_obj = {
                            t_status: 3,  // 上链失败
                            vm_err: gasLimitRet.err
                        };

                        console.log("nftUpdateSelective:", trans_from_obj);
                        await updateTransFormList(trans_from_obj, {id: id})
                    } else if ("ErrFunds must less than 0.105 ETH" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                    } else if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                        let trans_from_obj = {
                            t_status: 6  // 上链成功
                        };
                        let newVar1 = await updateTransFormList(trans_from_obj, {id: id});
                        console.log(newVar1)
                    } else if ("replacement fee too low" == gasLimitRet.err) {
                    } else {
                    }
                    continue;
                } else {
                    const balance = await customHttpProvider.getBalance(t_from, "pending");
                    const deficit = transferFundingDeficit(gasLimitRet.gasLimit, balance);
                    if (!deficit.isZero()) {
                        if (contractAddressDetail.address.toLowerCase() === t_from.toLowerCase()) {
                            await setString("BALANCE_" + t_from, "1", 60);
                            continue;
                        }
                        const funding = await transfer(contractAddressDetail.private_key, deficit, t_from, wallet);
                        if (funding.err) {
                            console.log("Transfer gas funding failed:", id, funding.err);
                        } else {
                            await setString("BALANCE_" + t_from, "1", 60);
                            console.log("Transfer gas funded:", id, funding.hash);
                        }
                        continue;
                    }
                    const result = await submitSignedOrder({
                        locks: nonceLocks,
                        provider: customHttpProvider,
                        address: t_from,
                        previous: {hash: previousHash, nonce: previousNonce},
                        hasReservation: nonce => hasReservedTransferNonce(t_from, nonce, id),
                        prepare: async nonce => {
                            const network = await customHttpProvider.getNetwork();
                            if (network.chainId !== 27) throw new Error("Unexpected chainId for transfer");
                            const unsigned = await contractWithSigner.populateTransaction.transfer(
                                assetClass, collectAddress, t_from, transferTo, token_id,
                                orderIdEcc, amount, transferDirection, transferType, data,
                                {
                                    nonce,
                                    gasLimit: gasLimitRet.gasLimit,
                                    maxFeePerGas: TRANSFER_MAX_FEE_PER_GAS.toHexString(),
                                    maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9)
                                }
                            );
                            delete unsigned.from;
                            unsigned.chainId = 27;
                            unsigned.type = 2;
                            return unsigned;
                        },
                        sign: unsigned => wallet.signTransaction(unsigned),
                        hashSigned: raw => ethers.utils.keccak256(raw),
                        persist: async ({hash, nonce}) => {
                            const saved = await updateTransFormList(
                                {hash, nonce, t_status: 5}, {id, t_status: 1});
                            if (saved.err || !saved.result || Number(saved.result[0]) !== 1) {
                                throw saved.err || new Error("Transfer order was not reserved in DB");
                            }
                            submittedHash = hash;
                        },
                        broadcast: async raw => {
                            const sent = await customHttpProvider.sendTransaction(raw);
                            if (sent.hash.toLowerCase() !== ethers.utils.keccak256(raw).toLowerCase()) {
                                throw new Error("Broadcast hash differs from signed transaction");
                            }
                        }
                    });
                    if (result.action === "mined-success") {
                        await updateTransFormList({t_status: 6}, {id, t_status: 1});
                    } else if (result.action === "in-flight") {
                        await updateTransFormList({t_status: 5}, {id, t_status: 1});
                    } else if (result.action !== "sent") {
                        console.log("Transfer deferred:", id, result.action);
                    }
                    continue;
                }
            } catch (e) {
                if (submittedHash && e.code === "INSUFFICIENT_FUNDS") {
                    const restored = await updateTransFormList(
                        {t_status: 1, hash: previousHash || null, nonce: previousNonce == null ? null : previousNonce},
                        {id, t_status: 5, hash: submittedHash}
                    );
                    if (restored.err) console.error("Transfer requeue failed:", id, restored.err);
                }
                console.error(e)
                console.trace(e)
                continue;
            }

        }

        } finally {
        console.timeEnd("betchTransfer");
        }
    }, {ttlMs: 120000});
    if (!lease.acquired) console.log('===================wait start betchTransfer');
}


async function transfer(privateKey, value, toAddress, walletUser) {
    let customHttpProvider = getCustomHttpProvider()
    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    // if (GlobalConfig.CAN_AUTH) {
    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    let isAuth = await auths_single(walletUser.address);
    if (isAuth.data != true) {
        // 这里进行预先实名
        let idHash = await auths_idHash(walletUser.address)
        if (idHash.data === '0x00000000000000000000000000000000') {
            console.log(responseFunStr(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}))


            let _account_to = await findAccount({address: toAddress});
            let _to_wallet = await getPriKey(_account_to.result, _account_to.result.psd);
            let _towallet = new ethers.Wallet(_to_wallet.result.privateKey, customHttpProvider);
            let _s_walletSys = new ethers.Wallet(GlobalConfig.AUTH_CONTROLLER_PK, customHttpProvider);
            await auth_user_v1(_towallet, _s_walletSys.address, "{auto _ auth}")
            // return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
        } else {
            await auth_user_v2(walletUser, idHash, walletSys.address)
        }
    }
    // }


    try {
        const result = await sendAtPendingNonce({
            locks: nonceLocks,
            provider: customHttpProvider,
            address: walletSys.address,
            hasReservation: nonce => hasReservedTransferNonce(walletSys.address, nonce),
            send: nonce => walletSys.sendTransaction({
                to: toAddress,
                nonce,
                maxFeePerGas: Web3.utils.numberToHex(4800e9),
                maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
                value: Web3.utils.toHex(value)
            })
        });
        if (result.action !== "sent") return {err: result.action, hash: null};
        return {err: null, hash: result.tx.hash};
    } catch (err) {
        console.trace("txTransfererr:", err);
        return {err, hash: null};
    }
}

// betchTransfer();
module.exports = {
    betchTransfer
};
