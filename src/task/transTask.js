const {
    isEmpty
} = require("../rules/rules");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
const {
    getString,
    setString,
    removeString, getKeys, lpop,
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

const {id_fun} = require("./taskConst");
const {customHttpProvider} = require("./taskConst");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findTransFormListAll, updateTransFormList} = require("../Orm/TransFormListService");
const {Op} = require('sequelize')
const {findAccount} = require("../Orm/AccountService");
const {findCollect} = require("../Orm/CollectService");
const {auth_user_v1, auth_user_v2, auths_single, auths_idHash} = require("../services/accountService");
const {queryBalance} = require("../chain/balanceQuery");

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

async function betchTransfer() {
    if (await getString(betchTransferFlag) == "1") {
        console.log('===================wait start mintBetchCallFund')
        return
    } else {
        await setString(betchTransferFlag, "1", 60)

        console.time("betchTransfer")

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
            limit: 500,
        })

        // console.log("betchTransferThread", sql)
        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.result);
        }
        transList = transList_ret.result;
        for (let retKey in transList) {
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
                update_time
            } = transList[retKey];
            // TODO 待完成
            // await lpop("TRANSFER_F")
            try {
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
                if (isBal == "1") {
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
                        continue;
                    }
                }

                if (isApprovedForAll == false) {

                    console.log("Balance: ", etherString);
                    if (Number(etherString) < Number(String(0.66))) {
                        let privateKey = contractAddressDetail.private_key;
                        if (isEmpty(privateKey)) {
                            continue;
                        } else {
                            let {
                                err,
                                hash
                            } = await transfer(privateKey, ethers.utils.parseEther(String(0.66)), t_from, wallet);
                            if (err != null) {
                                console.log("txTransfer faild");
                                continue;
                            }
                            console.log("tx Hash:", hash);
                            continue;
                        }

                    }


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

                    let nonce = await getNonce(t_from);

                    let gasLimitA = gasLimitRet.gasLimit
                    let txApproveRet = await contractWithSignerToken.setApprovalForAll(
                        CtTransferExecutorAddress,
                        true,
                        {
                            // The maximum units of gas for the transaction to use
                            gasLimit: Web3.utils.numberToHex(gasLimitA),
                            // The price (in wei) per unit of gas
                            // gasPrice: Web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                            // The nonce to use in the transaction
                            nonce: nonce,
                            gasPrice: Web3.utils.numberToHex(4800e9),
                            // The amount to send with the transaction (i.e. msg.value)
                            // value: utils.parseEther('1.0'),
                            // The chain ID (or network ID) to use
                            // chainId: 27
                        }
                    );
                    continue;
                    // let recept1 = await customHttpProvider.waitForTransaction(txApproveRet.hash);
                    //
                    // console.log("txApprove:", recept1);

                } else {

                    console.log("Balance: ", etherString);

                    if (Number(etherString) < Number(String(0.44))) {
                        let privateKey = contractAddressDetail.private_key;
                        if (isEmpty(privateKey)) {
                            continue;
                        } else {
                            let {
                                err,
                                hash
                            } = await transfer(privateKey, ethers.utils.parseEther(String(0.44)), t_from, wallet);
                            if (err != null) {
                                console.log("txTransfer faild");
                                continue;
                            }
                            console.log("tx Hash:", hash);
                            continue;
                        }
                    }

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
                        "execution reverted: ERC1155: transfer to non ERC1155Receiver implementer" == gasLimitRet.err
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

                    let tx;
                    let txRet;

                    let gasLimit = gasLimitRet.gasLimit;
                    console.log("gasLimit:", gasLimit.toString());
                    let nonce = await getNonce(t_from);

                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: Web3.utils.numberToHex(gasLimit),
                        // gasLimit: Web3.utils.numberToHex(80000),
                        // The price (in wei) per unit of gas
                        gasPrice: Web3.utils.numberToHex(4800e9),

                        // The nonce to use in the transaction
                        nonce: nonce,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };
                    // 设置一个新值，返回交易

                    txRet = await contractWithSigner
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
                            data,
                            overrides
                        )
                        .then((ret) => {
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            console.trace("err:", err);
                            return {err: err.reason, data: null};
                        });
                    tx = txRet.data;
                    // console.log("txRet:", txRet);
                    // console.log("txTransForm:", tx);
                    if (txRet.err == null) {
                        // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                        // save db
                        let trans_from_obj = {
                            hash: tx.hash,
                            nonce: nonce,

                            t_status: 5  // 上链成功
                        };
                        console.log("nftUpdateSelective:", trans_from_obj);

                        let result002 = await updateTransFormList(trans_from_obj, {id: id})

                        if (result002.err != null) {
                            console.trace(responseFun(RESPONSE_STATUS.ERROR, result002.result, ""), id);
                        }
                        console.log("update TransFrom data:", result002.result);
                        continue;
                    } else {
                        if ("execution reverted: ERC1155: insufficient balance for transfer" == txRet.err) {
                            let trans_from_obj = {
                                t_status: 3, // 上链失败
                                vm_err: gasLimitRet.err
                            };
                            console.log("nftUpdateSelective:", trans_from_obj);
                            await updateTransFormList(trans_from_obj, {id: id})
                            continue;
                        }
                        if ("ErrFunds must less than 0.105 ETH" == txRet.err) {
                            // 计算手续费导致的错误, 稍后重试
                            continue;
                        }
                        if ("ErrFunds must less than 0.105 ETH" == txRet.err) {
                            // 计算手续费导致的错误, 稍后重试
                            continue;
                        }
                        if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                            // 计算手续费导致的错误, 稍后重试
                            let trans_from_obj = {
                                t_status: 6  // 上链成功
                            };

                            await updateTransFormList(trans_from_obj, {id: id})
                            continue;
                        }
                        if ("replacement fee too low" == txRet.err) {
                            //手续费不足
                            continue;
                        }
                        //手续费不足
                        console.trace("txRet.err", txRet.err);
                        continue;

                    }
                }
            } catch (e) {
                console.error(e)
                console.trace(e)
                continue;
            }

        }

        await removeString(betchTransferFlag)
        console.timeEnd("betchTransfer");

    }
}


async function transfer(privateKey, value, toAddress, walletUser) {

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
            walletSys = new ethers.Wallet(GlobalConfig.AUTH_CONTROLLER_PK, customHttpProvider);
            await auth_user_v1(_towallet, walletSys.address, "{}")
            // return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
        } else {
            await auth_user_v2(walletUser, idHash, walletSys.address)
        }
    }
    // }


    let nonce = await getNonce(walletSys.address)
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        nonce: nonce,
        gasPrice: Web3.utils.numberToHex(4800e9),
        value: Web3.utils.toHex(value),
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        // let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        // console.log("recept1:", recept1);
        // if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
        //     throw "Transaction Reverted";
        // }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.trace("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

betchTransfer();
module.exports = {
    betchTransfer
};
