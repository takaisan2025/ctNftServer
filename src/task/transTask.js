const {
    isEmpty
} = require("../rules/rules");
const GlobalConfig = require("../config/GlobalConfig.json");
const gasConfig = require("../config/gasConfig.json");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem, getKeys,
} = require("../redis/redis-client");

const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
let CtTransferExecutorAddress = GlobalConfig.CtTransferExecutorAddress;
const ethers = require("ethers");

const ethUtil = require("ethereumjs-util");
const ABI_const = require("../contract/ABI_const");
const {responseFunStr} = require("../mapper/account");
const {contract_static_call} = require("../contract/ChainCall");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");
let excloudAddr = ""

const betchTransferFlag = "betchTransfer_START";

const EIP712 = require("../routers/EIP712");
const sigUtil = require("eth-sig-util");
const {id_fun} = require("./taskConst");
const {customHttpProvider} = require("./taskConst");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findTransFormListAll, updateTransFormList} = require("../Orm/TransFormListService");
const {Op} = require('sequelize')
const {findAccount} = require("../Orm/AccountService");
const {findCollect} = require("../Orm/CollectService");
const {updateNftTransaction, createNftTransaction} = require("../Orm/NftTransactionService");

async function betchTransfer() {
    if (await getString(betchTransferFlag) == "1") {
        console.log('===================wait start mintBetchCallFund')
        return
    } else {
        await setString(betchTransferFlag, "1", 60)

        console.time("betchTransfer")

        var sql

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
                }
            },
            offset: 0,
            limit: 500,
        })

        // console.log("betchTransferThread", sql)
        let transList = []
        if (transList_ret.code != 0) {
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
            try {
                console.log(collectAddress)
                let accountDetail_ret01 = await findAccount(_where = {address: t_from})
                let accountDetail = accountDetail_ret01.result[0]

                let collectDetail_ret02 = await findCollect(_where = {address: collectAddress})

                if (collectDetail_ret02.code != 0) {
                    console.trace("ERR:", collectDetail_ret02.result);
                }

                let collectDetail = collectDetail_ret02.result[0]
                let contractAddressDetailAsync;
                if (collectDetail.owner.toLowerCase() == t_from.toLowerCase()) {
                    contractAddressDetailAsync = accountDetail;
                } else {
                    let contractAddressDetailAsync_ret = await findAccount(_where = {address: collectDetail.owner});
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
                let balance = await wallet.provider.getBalance(t_from);
                // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                let etherString = ethers.utils.formatEther(balance);

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

                    await setString("BALANCE_" + contractAddressDetail.address, "1", 300)
                    // 跳出, 重新查询数据
                    console.log("草田分余额不足:", contractAddressDetail.address)
                    continue;
                } else {
                    let balanceC = await wallet.provider.getBalance(contractAddressDetail.address.toLowerCase());
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    let etherStringC = ethers.utils.formatEther(balanceC);
                    if (Number(etherStringC) < Number(String(10))) {
                        await setString("BALANCE_" + contractAddressDetail.address, "1", 300)
                        // 跳出, 重新查询数据
                        console.log("草田分余额不足:", contractAddressDetail.address)
                        continue;
                    }
                }

                if (isApprovedForAll == false) {

                    console.log("Balance: ", etherString);
                    if (Number(etherString) < Number(String(0.66))) {
                        let privateKey = contractAddressDetail.private_key;
                        if (isEmpty(privateKey).flag) {
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
                            return {err: err.reason, gasLimit: null}
                        });
                    if (gasLimitRet.err != null) {
                        continue;
                    }
                    let gasLimitA = gasLimitRet.gasLimit
                    let txApproveRet = await contractWithSignerToken.setApprovalForAll(
                        CtTransferExecutorAddress,
                        true,
                        {
                            // The maximum units of gas for the transaction to use
                            gasLimit: web3.utils.numberToHex(gasLimitA),
                            // The price (in wei) per unit of gas
                            // gasPrice: web3.utils.numberToHex(parseInt(gasConfig.approvalAll.gas / Number(gasLimitA))),
                            // The nonce to use in the transaction
                            // nonce: nonce,
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
                        if (isEmpty(privateKey).flag) {
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
                            t_status: 3  // 上链失败
                        };

                        console.log("nftUpdateSelective:", trans_from_obj);
                        await updateTransFormList(_params = trans_from_obj, _where = {id: id})
                    } else if ("ErrFunds must less than 0.105 ETH" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                    } else if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                        let trans_from_obj = {
                            t_status: 6  // 上链成功
                        };
                        let newVar1 = await updateTransFormList(_params = trans_from_obj, _where = {id: id});
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

                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimit),
                        // gasLimit: web3.utils.numberToHex(80000),
                        // The price (in wei) per unit of gas
                        // gasPrice: web3.utils.numberToHex(parseInt(gasConfig.transfer.gas / Number(gasLimit))),
                        // The nonce to use in the transaction
                        // nonce: nonce,
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
                            console.trace("err:", err.reason);
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
                            t_status: 5  // 上链成功
                        };
                        console.log("nftUpdateSelective:", trans_from_obj);

                        let result002 = await updateTransFormList(_params = trans_from_obj, _where = {id: id})

                        if (result002.code != 0) {
                            console.trace(responseFun(500, result002.result, ""), id);
                        }
                        console.log("update TransFrom data:", result002.result);
                        continue;
                    } else {
                        if ("execution reverted: ERC1155: insufficient balance for transfer" == txRet.err) {
                            let trans_from_obj = {
                                t_status: 3 // 上链成功
                            };
                            console.log("nftUpdateSelective:", trans_from_obj);
                            await updateTransFormList(_params = trans_from_obj, _where = {id: id})
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

                            await updateTransFormList(_params = trans_from_obj, _where = {id: id})
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

async function authUser(walletUser) {

    let address = walletUser.address;
    let orderId = new Date().getTime() + "sys_a_auto";
    // 计算签名
    let orderIdEcc = `0x${ethUtil
        .keccak256(Buffer.from(orderId + ""))
        .toString("hex")}`;

    // 判断接入方用户名密码
    let privateKeySys = GlobalConfig.AUTH_CONTROLLER_PK // TODO 这里需要系统地址
    let s_wallet = new ethers.Wallet(privateKeySys, customHttpProvider);

    let c_wallet = walletUser;
    // 判断商家身份
    let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
    //等待其它程序处理上链
    let sender = s_wallet.address;
    let authTime = 1766841499; // 没有用的参数
    let authExpiry = Math.round(new Date().getTime() / 1000) + 1 * 60 * 60 * 24 * 180; // 六个月
    let isAuth = true;
    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
    let expandData = '{hash: \\"\\", version: \\"v1.0.0\\"}';
    console.log(expandData)
    let caddress = c_wallet.address;
    // 计算签名
    let auth = {
        caddress,
        sender,
        authTime,
        authExpiry,
        isAuth,
        authLevel,
        expandData,
    };

    let privateKeyStr = c_wallet.privateKey;
    let verifyingContract = contractAddress;
    privateKeyStr = web3.utils.stripHexPrefix(privateKeyStr);

    const privateKey = Buffer.from(privateKeyStr, "hex");

    // uint256 orderId,
    // address caddress,
    // address sender,
    // bool isAuth,
    // string expandData

    const Types = {
        Authentication: [
            {type: "uint256", name: "orderId"},
            {type: "address", name: "caddress"},
            {type: "address", name: "sender"},
            {type: "bool", name: "isAuth"},
        ],
    };

    const data = EIP712.createTypeData(
        {
            name: "Authentication",
            version: "1",
            chainId: "27",
            verifyingContract,
        },
        "Authentication",
        {
            orderId: orderIdEcc,
            caddress: auth.caddress,
            sender: auth.sender,
            isAuth: auth.isAuth,
        },
        Types
    );

    let signature = sigUtil.signTypedData_v4(privateKey, {data: data});
    auth.signature = signature;

    let origin_data_json = [auth, orderIdEcc];
    // 存储上链数据
    // 插入数据库
    let nft_transaction = {
        from: s_wallet.address,
        to: contractAddress,
        status: 0,
        // "hash": "",
        // "block_number": "",
        type: 1,
        is_reback: 0,
        order_id: orderId,
        value: "0",
        // "origin_data": JSON.stringify(origin_data_json),
        origin_data: origin_data_json,
        contract_address: contractAddress,
        method:
            ABI_const["AuthController"].contractName +
            "#" +
            "authentication",
        origin_value: "0",
    };


    let nft_transaction_aql_result = await createNftTransaction(_obj = nft_transaction)

    if (nft_transaction_aql_result.code != 0) {
        if (nft_transaction_aql_result.result == "ER_DUP_ENTRY") {
            return responseFunStr(500, "OrderId 冲突!", {});
        } else {
            return responseFunStr(500, "操作失败,请重试!", {});
        }
    }
    console.log(responseFunStr(RESPONSE_STATUS.SUCCESS, "请求成功", {
        s_address: s_wallet.address,
        address: address,
        orderId: orderId,
    }))

}

async function transfer(privateKey, value, toAddress, walletUser) {

    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    // if (GlobalConfig.CAN_AUTH) {
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
    let isAuth = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthController"].abi,
        "authsSingle",
        customHttpProvider,
        [walletUser.address]
    );
    if (isAuth.data != true) {
        // 这里进行预先实名
        await authUser(walletUser)
        console.log(responseFunStr(500, "用户信息未认证或过期,请稍后重试!", {}))
        return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
    }
    // }

    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.toHex(value),
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

// betchTransfer();
module.exports = {
    betchTransfer
};
