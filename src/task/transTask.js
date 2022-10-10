const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml"
]);
const EventEmitter = require('events')
EventEmitter.setMaxListeners(500)
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
const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
// let web3o = new Web3("https://exploder.coozw.com/blockChain");
let web3 = web3o;
const fetch = require("node-fetch");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
const CtTransferExecutorAddress = "0xF41d25234dB41465450F5cCfE1e302A1fA0E2fEF";
const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[1];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
let gasPrice = "5000100000000";
let isGasPrice = false;
const ethUtil = require("ethereumjs-util");
var format = {language: "sql", indent: "  "};

async function betchTransfer() {
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
        var params1 = {address: collectAddress};
        var sql1 = mybatisMapper.getStatement(
            "collect",
            "selectByAddress",
            params1,
            format
        );
        let collectDetail = await execSql(sql1)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("ERR:", err);
                return err;
            });
        let contractAddressDetail;
        if (collectDetail.owner.toLowerCase() == t_from.toLowerCase()) {
            contractAddressDetail = accountDetail;
        } else {
            contractAddressDetail = accountSelectSelective(collectDetail.owner);
        }
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

        // 链上余额判断
        let balance = await wallet.provider.getBalance(t_from);
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        let etherString = ethers.utils.formatEther(balance);
        console.log("Balance: ", etherString);
        if (Number(etherString) < Number(String(1))) {
            let privateKey = contractAddressDetail.private_key;
            let {err, hash} = await transfer(privateKey, ethers.utils.parseEther(String(1)), t_from);
            if (err != null) {
                console.log("txTransfer faild");
                continue;
            }
            console.log("tx Hash:", hash);
        }

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
        if (isApprovedForAll == false) {
            // 进行授权
            let txApproveRet = await contractWithSignerToken.setApprovalForAll(
                CtTransferExecutorAddress,
                true
            );
            let recept1 = await customHttpProvider.waitForTransaction(txApproveRet.hash);

            console.log("txApprove:", recept1);

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
                return {err: err.reason, gasLimit: null}
            });
        if (gasLimitRet.err != null) {
            console.log(gasLimitRet.err);
            // console.log(minted721TokenStr == gasLimitRet.err)
            if ("execution reverted: ERC1155: insufficient balance for transfer" == gasLimitRet.err) {
                let trans_from_obj = {
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
            } else if ("execution reverted: order has been processed!" == gasLimitRet.err) {
                // 计算手续费导致的错误, 稍后重试
                let trans_from_obj = {
                    t_status: 6, // 上链成功
                    id: id
                };

                var paramsUp1 = trans_from_obj;
                var sqlUp1 = mybatisMapper.getStatement(
                    "trans_form_list",
                    "updateByPrimaryKeySelective",
                    paramsUp1,
                    format
                );
                await execSql(sqlUp1);
            } else if ("replacement fee too low" == gasLimitRet.err) {
                await updateNonce(t_from, transactionCount1Mint + 1);
            } else {
                await delNonce(t_from);
            }
            continue;
        } else {

            let tx;
            let txRet;
            let transactionCount1Mint;
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
            let gasLimit = gasLimitRet.gasLimit;
            console.log("gasLimit:", gasLimit.toString());
            let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
            console.log("gasPrice*:", neceliby);

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
                    console.log("err:", err.reason);
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
                continue;
            } else {
                if ("execution reverted: ERC1155: insufficient balance for transfer" == txRet.err) {
                    let trans_from_obj = {
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
                        t_status: 6, // 上链成功
                        id: id
                    };

                    var paramsUp1 = trans_from_obj;
                    var sqlUp1 = mybatisMapper.getStatement(
                        "trans_form_list",
                        "updateByPrimaryKeySelective",
                        paramsUp1,
                        format
                    );
                    await execSql(sqlUp1);
                    continue;
                }
                if ("replacement fee too low" == txRet.err) {
                    //手续费不足
                    await updateNonce(t_from, transactionCount1Mint + 1);
                    continue;
                }
                //手续费不足
                console.error("txRet.err", txRet.err);
                await delNonce(t_from);
                continue;

            }
        }
    }
    console.log("betchTransfer All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchTransfer Start !!")
        betchTransfer()
    }, 2000);
}

async function betchHashQuery() {
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
        if (!hash || hash == "" || hash == null) {
            continue;
        }
        let recept = await web3.eth.getTransactionReceipt(hash);
        let currTime = new Date().getTime();
        if (currTime - update_time.getTime() < 10000) {   // hash产生不到10s自动跳过
            continue;
        } else {
            let t_statusStorage;
            if (recept != null && recept.status == true) {
                t_statusStorage = 6;
            } else {

                // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                // save db
                // if (recept.data.transaction == null || recept.data.transaction.status == null) {
                if (currTime - update_time.getTime() < 60000) {
                    continue;
                } else {
                    await delNonce(t_from);
                    t_statusStorage = 1;
                    console.log("查询hash结果false,", hash);
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
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery()
    }, 2000)
}

function id_fun(str) {
    return `0x${ethUtil
        .keccak256(Buffer.from(str))
        .toString("hex")
        .substring(0, 8)}`;
}

async function transfer(privateKey, value, toAddress) {
    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    // console.log("nonce: " + nonce);
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

    let urls = [];
    for (let retKey in transList) {

        const {
            token_id,
            id,
            hash,
            update_time,
            orderId,
            reback_url
        } = transList[retKey];
        var formdata = new FormData()

        // if (reback_url == "" || reback_url == null) {
        //     continue;
        // }

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
            redirect: "follow"
        };

        urls.push({
            url: reback_url,
            id: id,
            param: requestOptions
        });

        handleFetchQueue(urls, max, callbackByCall);
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchCallFund Start !!")
        betchCallFund()
    }, 2000)
}

const max = 5;

function handleFetchQueue(urls, max, callback) {
    const urlCount = urls.length;
    const requestsQueue = [];
    const results = [];
    let i = 0;
    const handleRequest = (url) => {
        if (url != undefined) {
            // console.log("回调urlDetail:", url);
            const req = fetch(url.url, url.param).then(res => {
                console.log("回调返回原始内容status:", res.status);
                console.log("回调返回原始内容statusText:", res.statusText);
                return res.json();
            }).then(res => {
                console.log("回调返回处理结果:", res);
                console.log('当前并发： ');
                console.log(requestsQueue);
                const len = results.push({data: res, id: url.id, err: null});
                if (len < urlCount && i + 1 < urlCount) {
                    requestsQueue.shift();
                    handleRequest(urls[++i])
                } else if (len === urlCount) {
                    'function' === typeof callback && callback(results)
                }
            }).catch(e => {
                console.log("回调错误:", e, ",id", url.id);
                results.push({err: e, data: null, id: url.id})
            });
            if (requestsQueue.push(req) < max) {
                handleRequest(urls[++i])
            }
        }

    };
    handleRequest(urls[i])
}

async function callbackByCall(result) {
    console.log('run callback');
    console.log(result);
    for (const resultElement of result) {
//处理响应结果
        let response = resultElement.data
        //处理响应结果
        console.log(response);

        if (response != null && response.status == 1) {

            let trans_from_obj = {
                t_status: 4, // 上链成功
                id: resultElement.id
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
                    console.error(responseFun(500, err, ""), resultElement.id);
                    return responseFun(500, err, "");
                });
        } else if (response != null && response.msg == "作品不存在") {

            let trans_from_obj = {
                t_status: 8, // 上链成功
                id: resultElement.id
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
            // console.log("回调接口失败,", resultElement.id);
            //
            // let trans_from_obj = {
            //     t_status: 8, // 上链成功
            //     id: resultElement.id
            // };
            // console.log("nftUpdateSelective:", trans_from_obj);
            //
            // var paramsUp = trans_from_obj;
            // var sqlUp = mybatisMapper.getStatement(
            //     "trans_form_list",
            //     "updateByPrimaryKeySelective",
            //     paramsUp,
            //     format
            // );
            // let result = await execSql(sqlUp);
        }

    }
};

async function betchCallFund1() {
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
        let {
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
        if (hash == null) {
            hash = "none";
        }
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
            //
            // let trans_from_obj = {
            //     t_status: 8, // 上链成功
            //     id: id
            // };
            // console.log("nftUpdateSelective:", trans_from_obj);
            //
            // var paramsUp = trans_from_obj;
            // var sqlUp = mybatisMapper.getStatement(
            //     "trans_form_list",
            //     "updateByPrimaryKeySelective",
            //     paramsUp,
            //     format
            // );
            // let result = await execSql(sqlUp);
        }
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchCallFund Start !!")
        betchCallFund1()
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
// betchCallFund();
betchCallFund1();

module.exports = {
    betchTransfer
};
// node src\task\transTask.js