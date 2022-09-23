const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml"
]);
const {
    graphiqlHashQuery
} = require("../broapi/broapi");
const {
    queryNonce,
    insertNonce,
    updateNonce,
    delNonce
} = require("../mapper/NftNonceMapper");


const {
    accountSelectSelective,
    execSql,
    execSqlAll,
    responseFun,
    responseFunStr,
} = require("../controller/ctnft");
const GlobalConfig = require("../config/GlobalConfig.json");
const FormData = require("form-data");
const web3 = require("web3");
const fetch = require("node-fetch");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[1];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
let gasPrice = "5000100000000";
let isGasPrice = false;

async function betchTransfer() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 1};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatus",
        params,
        format
    );
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    for (let retKey in transList) {
        // console.log(ret[retKey]);
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
        let accountDetail = accountSelectSelective(t_from);
        let accountItem = await accountDetail.then((result) => {
            return result;
        });
        // try {
        let wallet;
        if (accountItem.private_key) {
            wallet = new ethers.Wallet(accountItem.private_key, customHttpProvider);
        } else {
            wallet = await ethers.Wallet.fromEncryptedJson(
                accountItem.keystore,
                accountItem.psd
            );
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

        }

        // 使用Provider 连接合约，将只有对合约的可读权限
        let transferTo = t_to;
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
        console.log("gasPrice:", gasPrice.toString());

        if (type == 10 || type == 12) {
            let contract = new ethers.Contract(
                collectAddress,
                ERC1155Ctnft.abi,
                customHttpProvider
            );

            // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
            let contractWithSigner = contract.connect(wallet);
            //safeTransferFrom(from, to, data.tokenId, transfer, "");

            let tx;
            let txRet;
            let transactionCount1Mint;
            if (transferTo == GlobalConfig.ZERO_ADDRESS) {
                let gasLimitRet = await contractWithSigner.estimateGas
                    .burn(
                        t_from,
                        token_id,
                        amount
                    )
                    .then((ret) => {
                        return {err: null, gasLimit: ret}
                    })
                    .catch((err) => {
                        console.log("err:", err.reason);
                        return {err: err.reason, gasLimit: null}
                    });
                let gasLimit = gasLimitRet.gasLimit;

                if (gasLimit == null) {
                    if ("execution reverted: ERC1155: insufficient balance for transfer" == gasLimitRet.err) {
                        let trans_from_obj = {
                            hash: "none",
                            t_status: 3, // 上链成功
                            id: id
                        };
                        console.log("nftUpdateSelective:", trans_from_obj);

                        var paramsUp = trans_from_obj;
                        var sqlUp = mybatisMapper.getStatement(
                            "trans_form_list",
                            "updateByPrimaryKeySelective",
                            paramsUp,
                            format
                        );
                        await execSql(sqlUp);
                    } else if ("ErrFunds must less than 0.105 ETH" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                    } else if ("replacement fee too low" == gasLimitRet.err) {
                        await updateNonce(t_from, transactionCount1Mint + 1);
                    } else {
                        await delNonce(t_from);
                    }
                    continue;
                } else {
                    console.log("gasLimit:", gasLimit.toString());
                    let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
                    console.log("gasPrice*:", neceliby);
                    let balance = await wallet.provider.getBalance(t_from);
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    let etherString = ethers.utils.formatEther(balance);
                    console.log("Balance: ", etherString);

                    //这里进行判断, 如果是合约持有者, 将不进行手续费赠送
                    var format1 = {language: "sql", indent: "  "};
                    var params1 = {address: collectAddress};
                    var sql1 = mybatisMapper.getStatement(
                        "collect",
                        "selectByAddress",
                        params1,
                        format1
                    );
                    let collectDetail = await execSql(sql1);
                    if (collectDetail['owner'].toLowerCase() == t_from.toLowerCase()) {
                        console.error("合约持有者余额不足,请充值!", t_from);
                        await delNonce(t_from);
                        continue;
                        // let {err, hash} = await transfer(neceliby.toString(), t_from);
                    } else {
                        if (Number(etherString) < 1) {
                            let {err, hash} = await transfer(ethers.utils.parseEther(String(1)), t_from);
                            if (err != null) {
                                //
                                console.log("txTransfer faild");
                                continue;
                            }
                            console.log("tx Hash:", hash);
                        }
                    }
                    //这里通过数据库查询来获取nonce
                    var nonceResult = await queryNonce(t_from);

                    let currTime = new Date().getTime();
                    if (nonceResult.length == 0) {
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await insertNonce(t_from, transactionCount1Mint);
                    } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
                        // 超时,重新获取nonce
                        console.log("超时,重新获取nonce.....................");
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await updateNonce(t_from, transactionCount1Mint);
                    } else {
                        transactionCount1Mint = nonceResult[0].nonce;
                    }
                    // gasPrice = 0;
                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimit),
                        // The price (in wei) per unit of gas
                        gasPrice: web3.utils.numberToHex(gasPrice),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        nonce: transactionCount1Mint,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };
                    // 设置一个新值，返回交易
                    txRet = await contractWithSigner
                        .burn(
                            t_from,
                            token_id,
                            amount,
                            overrides
                        )
                        .then((ret) => {
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            return {err: err.reason, data: null};
                        });
                }


            } else {
                let gasLimitRet = await contractWithSigner.estimateGas
                    .safeTransferFrom(
                        t_from,
                        transferTo,
                        token_id,
                        amount,
                        "0x"
                    )
                    .then((ret) => {
                        return {err: null, gasLimit: ret}
                    })
                    .catch((err) => {
                        console.log("err:", err);
                        return {err: err.reason, gasLimit: null}
                    });
                let gasLimit = gasLimitRet.gasLimit;
                //这里通过数据库查询来获取nonce
                var nonceResult = await queryNonce(t_from);
                let currTime = new Date().getTime();
                if (nonceResult.length == 0) {
                    transactionCount1Mint =
                        await customHttpProvider.getTransactionCount(t_from, "latest");
                    await insertNonce(t_from, transactionCount1Mint);
                } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
                    // 超时,重新获取nonce
                    console.log("超时,重新获取nonce.....................");
                    transactionCount1Mint =
                        await customHttpProvider.getTransactionCount(t_from, "latest");
                    await updateNonce(t_from, transactionCount1Mint);
                } else {
                    transactionCount1Mint = nonceResult[0].nonce;
                }
                if (gasLimit == null) {
                    // console.log(minted721TokenStr == gasLimitRet.err)
                    if ("execution reverted: ERC1155: insufficient balance for transfer" == gasLimitRet.err) {
                        let trans_from_obj = {
                            hash: "none",
                            t_status: 3, // 上链成功
                            id: id
                        };
                        console.log("nftUpdateSelective:", trans_from_obj);

                        var paramsUp = trans_from_obj;
                        var sqlUp = mybatisMapper.getStatement(
                            "trans_form_list",
                            "updateByPrimaryKeySelective",
                            paramsUp,
                            format
                        );
                        await execSql(sqlUp);
                    } else if ("ErrFunds must less than 0.105 ETH" == gasLimitRet.err) {
                        // 计算手续费导致的错误, 稍后重试
                    } else if ("replacement fee too low" == gasLimitRet.err) {
                        await updateNonce(t_from, transactionCount1Mint + 1);
                    } else {
                        await delNonce(t_from);
                    }
                    continue;
                } else {
                    console.log("gasLimit:", gasLimit.toString());
                    let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
                    console.log("gasPrice*:", neceliby);
                    let balance = await wallet.provider.getBalance(t_from);
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    let etherString = ethers.utils.formatEther(balance);
                    console.log("Balance: ", etherString);
                    if (Number(etherString) < Number(String(1))) {
                        let {err, hash} = await transfer(ethers.utils.parseEther(String(1)), t_from);
                        if (err != null) {
                            //
                            console.log("txTransfer faild");
                            continue;
                        }
                        console.log("tx Hash:", hash);
                    }

                    // gasPrice = 0;
                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimit),
                        // The price (in wei) per unit of gas
                        gasPrice: web3.utils.numberToHex(gasPrice),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        nonce: transactionCount1Mint,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };
                    // 设置一个新值，返回交易
                    txRet = await contractWithSigner
                        .safeTransferFrom(
                            t_from,
                            transferTo,
                            token_id,
                            amount,
                            "0x",
                            overrides
                        )
                        .then((ret) => {
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            console.log("err:", err.reason);
                            return {err: err.reason, data: null};
                        });

                }

            }
            tx = txRet.data;
            console.log("tx:", tx);

            // console.log("hash:", tx.hash);
            if (tx == null && "execution reverted: ERC1155: insufficient balance for transfer" == txRet.err) {
                let trans_from_obj = {
                    hash: "none",
                    t_status: 3, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                await execSql(sqlUp);
            } else if (tx != null) {
                // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                // save db
                let trans_from_obj = {
                    hash: tx.hash,
                    t_status: 5, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                let result = await execSql(sqlUp)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(responseFun(500, err, ""), id);
                    });
                console.log("update TransFrom data:", result);
                await updateNonce(t_from, transactionCount1Mint + 1)
            } else if (tx == null && "ErrFunds must less than 0.105 ETH" == txRet.err) {
                // 计算手续费导致的错误, 稍后重试
            } else if ("replacement fee too low" == txRet.err) {
                //手续费不足
                await updateNonce(t_from, transactionCount1Mint + 1);
            } else {
                //手续费不足
                console.error("txRet.err", txRet.err);
                await delNonce(t_from);
            }

        } else if (type === 9) {
            // 721
            let contract = new ethers.Contract(
                collectAddress,
                ERC721Ctnft.abi,
                customHttpProvider
            );
            // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
            let contractWithSigner = contract.connect(wallet);
            //safeTransferFrom(from, to, data.tokenId, transfer, "");
            // console.log("contractWithSigner.estimateGas",contractWithSigner.estimateGas)
            let tx;
            let txRet;
            let transactionCount1Mint;

            if (transferTo == GlobalConfig.ZERO_ADDRESS) {
                // Burn  burn
                let gasLimitRet = await contractWithSigner.estimateGas
                    .burn(
                        token_id
                    )
                    .then((ret) => {
                        return {err: null, gasLimit: ret}
                    })
                    .catch((err) => {
                        console.log("err:", err.reason);
                        return {err: err.reason, gasLimit: null}
                    });
                let gasLimit = gasLimitRet.gasLimit;

                console.log("gasLimit:", gasLimit.toString());
                if (gasLimit == null) {
                    continue;
                } else {
                    let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
                    console.log("gasPrice*:", neceliby);
                    let balance = await wallet.provider.getBalance(t_from);
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    let etherString = ethers.utils.formatEther(balance);
                    console.log("Balance: ", etherString);
                    if (Number(etherString) < Number(String(1))) {
                        let {err, hash} = await transfer(ethers.utils.parseEther(String(1)), t_from);
                        if (err != null) {
                            //
                            console.log("txTransfer faild");
                            continue;
                        }
                        console.log("tx Hash:", hash);
                    }
                    //这里通过数据库查询来获取nonce
                    var nonceResult = await queryNonce(t_from);
                    let currTime = new Date().getTime();
                    if (nonceResult.length == 0) {
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await insertNonce(t_from, transactionCount1Mint);
                    } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
                        // 超时,重新获取nonce
                        console.log("超时,重新获取nonce.....................");
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await updateNonce(t_from, transactionCount1Mint);
                    } else {
                        transactionCount1Mint = nonceResult[0].nonce;
                    }

                    // gasPrice = 0;

                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimit),
                        // The price (in wei) per unit of gas
                        gasPrice: web3.utils.numberToHex(gasPrice),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        nonce: transactionCount1Mint,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };
                    // 设置一个新值，返回交易
                    txRet = await contractWithSigner
                        .burn(
                            token_id,
                            overrides
                        )
                        .then((ret) => {
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            return {err: err.reason, data: null};
                        });

                }

            } else {
                let gasLimitRet = await contractWithSigner.estimateGas
                    .transferFrom(
                        t_from,
                        transferTo,
                        token_id
                    )
                    .then((ret) => {
                        return {err: null, gasLimit: ret}
                    })
                    .catch((err) => {
                        console.log("err:", err.reason);
                        return {err: err.reason, gasLimit: null}
                    });
                gasLimit = gasLimitRet.gasLimit;
                console.log("gasLimit:", gasLimit.toString());
                if (gasLimit == null) {
                    continue;
                } else {
                    let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
                    console.log("gasPrice*:", neceliby);
                    let balance = await wallet.provider.getBalance(t_from);
                    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                    let etherString = ethers.utils.formatEther(balance);
                    console.log("Balance: ", etherString);
                    if (Number(etherString) < Number(String(1))) {
                        let {err, hash} = await transfer(ethers.utils.parseEther(String(1)), t_from);
                        if (err != null) {
                            //
                            console.log("txTransfer faild");
                            continue;
                        }
                        console.log("tx Hash:", hash);
                    }
                    //这里通过数据库查询来获取nonce
                    var nonceResult = await queryNonce(t_from);
                    let currTime = new Date().getTime();
                    if (nonceResult.length == 0) {
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await insertNonce(t_from, transactionCount1Mint);
                    } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
                        // 超时,重新获取nonce
                        console.log("超时,重新获取nonce.....................");
                        transactionCount1Mint =
                            await customHttpProvider.getTransactionCount(t_from, "latest");
                        await updateNonce(t_from, transactionCount1Mint);
                    } else {
                        transactionCount1Mint = nonceResult[0].nonce;
                    }

                    // gasPrice = 0;

                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        gasLimit: web3.utils.numberToHex(gasLimit),
                        // The price (in wei) per unit of gas
                        gasPrice: web3.utils.numberToHex(gasPrice),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        nonce: transactionCount1Mint,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };
                    // 设置一个新值，返回交易
                    txRet = await contractWithSigner
                        .transferFrom(
                            t_from,
                            transferTo,
                            token_id,
                            overrides
                        )
                        .then((ret) => {
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            return {err: err.reason, data: null};
                        });

                }

            }
            tx = txRet.data;
            console.log("hash:", tx.hash);
            // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
            if (tx != null) {
                // save db
                let trans_from_obj = {
                    hash: tx.hash,
                    t_status: 5, // 上链成功
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                let result = await execSql(sqlUp)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(responseFun(500, err, ""), id);
                    });
                console.log("update TransFrom data:", result);
                await updateNonce(t_from, transactionCount1Mint + 1);

            } else if (tx == null && "ErrFunds must less than 0.105 ETH" == txRet.err) {
                // 计算手续费导致的错误, 稍后重试
            } else if ("replacement fee too low" == txRet.err) {
                //手续费不足
                await updateNonce(t_from, transactionCount1Mint + 1);
            } else {
                //手续费不足
                console.error("txRet.err", txRet.err);
                await delNonce(t_from);
            }
        } else if (type == 1) {
            // 1155
            let contract = new ethers.Contract(
                collectAddress,
                CtnftMToken.abi,
                customHttpProvider
            );
            console.log("ERROR:", "no implements");
        } else {
            console.log("ERROR:", "没有找到匹配的合约信息");
        }
    }
    console.log("betchTransfer All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchTransfer Start !!")
        betchTransfer()
    }, 2000)
}

async function betchHashQuery() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 5};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatus",
        params,
        format
    );
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    for (let retKey in transList) {
        console.log(transList[retKey]);
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
            hash
        } = transList[retKey];
        let receptRet = await graphiqlHashQuery(hash);
        let recept = receptRet.data;
        if (receptRet.data.err == null && recept.data.transaction != null) {
            console.log(recept.data.transaction);
            if (recept.data.transaction != null && recept.data.transaction.gasUsed == null) {
                console.log(recept.data.transaction);
                let currTime = new Date().getTime();
                if (currTime - update_time.getTime() > 60000) {   // 超过1min自动重新获取
                    await delNonce(t_from);
                    let trans_from_obj = {
                        t_status: 1, // 6 成功,7 失败
                        id: id
                    };
                    console.log("nftUpdateSelective:", trans_from_obj);

                    var paramsUp = trans_from_obj;
                    var sqlUp = mybatisMapper.getStatement(
                        "trans_form_list",
                        "updateByPrimaryKeySelective",
                        paramsUp,
                        format
                    );
                    await execSql(sqlUp);

                }
                continue;
            } else {
                // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                // save db
                let t_statusStorage;
                // if (recept.data.transaction == null || recept.data.transaction.status == null) {
                if (recept.data.transaction != null && recept.data.transaction.status == null) {
                    // t_statusStorage = 7;
                    formatTime(new Date());
                    console.log("查询hash结果为空,", hash);


                    continue;
                } else {

                    if (recept.data.transaction.status == "ERROR") {
                        console.log("hash出错:", recept.data.transaction);
                        if ("dropped/replaced" == recept.data.transaction.error) {
                            t_statusStorage = 1;
                        } else {
                            t_statusStorage = 7;
                        }

                    } else if (recept.data.transaction.status == "OK") {
                        t_statusStorage = 6;
                    } else {
                        continue;
                    }
                }

                let trans_from_obj = {
                    t_status: t_statusStorage, // 6 成功,7 失败
                    id: id
                };
                console.log("nftUpdateSelective:", trans_from_obj);

                var paramsUp = trans_from_obj;
                var sqlUp = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp,
                    format
                );
                await execSql(sqlUp);


            }

        }

    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery()
    }, 2000)
}

async function transfer(value, toAddress) {
    let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);
    // console.log("nonce: " + nonce);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.numberToHex(value),
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        console.log("recept1:", recept1);
        if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            throw {message: "Transaction Reverted"};
        }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

async function betchCallFund() {
    var format = {language: "sql", indent: "  "};
    var params = {t_status: 6};
    var sql = mybatisMapper.getStatement(
        "trans_form_list",
        "selectByStatus",
        params,
        format
    );
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.error(responseFunStr(500, err, {}));
        });
    for (let retKey in transList) {
        const {
            token_id,
            id,
            hash,
            update_time,
            orderId,
            reback_url
        } = transList[retKey];
        var formdata = new FormData();

        if (reback_url == "" || reback_url == null) {
            continue;
        }

        formdata.append("key", "qianyidata");
        // console.log(tokenId)
        formdata.append("tokenId", token_id);
        formdata.append("orderId", orderId);
        formdata.append("mintDate", formatTime(update_time));
        formdata.append("status", "true");
        formdata.append("hash", hash);
        // console.log("formdata:", formdata)
        var requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow",
        };

        let responseRet = await fetch(reback_url, requestOptions)
            .then((response) => {
                console.log("回调返回原始内容status:", response.status);
                console.log("回调返回原始内容statusText:", response.statusText);
                return response.json();
            })
            .then((response) => {
                console.log("回调返回处理结果:", response);
                return {data: response};
            })
            .catch((err) => {
                console.log("回调错误:", err, ",orderId", orderId);
                return {data: null, err: err};
            });
        //处理响应结果
        let response = responseRet.data
        //处理响应结果
        console.log(response);

        if (response != null && response.status == 1) {

            let trans_from_obj = {
                t_status: 4, // 上链成功
                id: id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = mybatisMapper.getStatement(
                "trans_form_list",
                "updateByPrimaryKeySelective",
                paramsUp,
                format
            );
            let result = await execSql(sqlUp)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.error(responseFun(500, err, ""), id);
                    return responseFun(500, err, "");
                });
        } else if (response != null && response.msg == "作品不存在") {

            let trans_from_obj = {
                t_status: 8, // 上链成功
                id: id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = mybatisMapper.getStatement(
                "trans_form_list",
                "updateByPrimaryKeySelective",
                paramsUp,
                format
            );
            let result = await execSql(sqlUp);
        } else {
            console.log("回调接口失败,", orderId);

            let trans_from_obj = {
                t_status: 8, // 上链成功
                id: id
            };
            console.log("nftUpdateSelective:", trans_from_obj);

            var paramsUp = trans_from_obj;
            var sqlUp = mybatisMapper.getStatement(
                "trans_form_list",
                "updateByPrimaryKeySelective",
                paramsUp,
                format
            );
            let result = await execSql(sqlUp);
        }
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchCallFund Start !!")
        betchCallFund()
    }, 2000)
}

function formatTime(date) {
    console.log("formatTime", date)
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`

}

//TEST
betchTransfer();
betchHashQuery()
betchCallFund();

module.exports = {
    betchTransfer
};
// node src\task\transTask.js