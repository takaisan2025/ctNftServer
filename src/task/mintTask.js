const {
    accountSelectSelective,
    nftSelectSelective,
    nftUpdateSelectiveStatus,
    nftSelectSelectiveStatus,
    nftSelectSelectiveCreator,
    nftInsertSelective,
    nftUpdateSelective,
    nftUpdateSelectiveIsFinish,
    responseFun,
    responseFunStr,
} = require("../controller/ctnft");
const fs = require("fs");
const ipfsAPI = require("ipfs-api");
const GlobalConfig = require("../config/GlobalConfig.json");
const ipfsNode = ipfsAPI({
    host: GlobalConfig.IPFS[1].HOST,
    port: GlobalConfig.IPFS[1].PORT,
    protocol: GlobalConfig.IPFS[1].PROTOCOL,
});
const {
    graphiqlHashQuery
} = require("../broapi/broapi");
const FormData = require("form-data");
const web3 = require("web3");
const fetch = require("node-fetch");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri

let reCallUrlChanel1 = "http://nft.richonn.com/home/nft/casting";

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

let minted721TokenStr = "execution reverted: ERC721: token already minted";
let minted1155TokenStr = "execution reverted: more than supply";

function Part(account, value) {
    return {
        account,
        value,
    };
}

function Mint721Data(tokenId, tokenURI, creators, royalties, signatures) {
    return {
        tokenId,
        tokenURI,
        creators,
        royalties,
        signatures,
    };
}

function Mint1155Data(
    tokenId,
    tokenURI,
    supply,
    creators,
    royalties,
    signatures
) {
    return {
        tokenId,
        tokenURI,
        supply,
        creators,
        royalties,
        signatures,
    };
}

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function fileUploadIpfs() {
    let nfts = nftSelectSelectiveStatus(0); // 资源未上链ipfs的条目
    let nftArr = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.error(responseFunStr(500, err, {}));
        });

    for (let retKey in nftArr) {
        // console.log(nftArr[retKey]);
        const {id, premetadata, tokenId, serverPath, tempPath} = nftArr[retKey];
        // 这里上传IPFS资源文件
        // 图片资源上传ipfs
        let data = await fs.readFileSync(serverPath);
        console.log("data:", data);
        let imgResponseRet = await ipfsNode
            .add(data)
            // .add(Buffer.from(data))
            .then((imgResponse) => {
                return imgResponse;
                return {err: null, data: imgResponse}
            })
            .catch((err) => {
                console.error(responseFunStr(500, err, {}));
                return {err: err, data: null}
            });
        if (imgResponseRet.err != null) {
            let imgResponse = imgResponseRet.data;
            console.log("imgResponse:", imgResponse);
            console.log("img:", imgResponse[0].path);
            //PIN
            ipfsNode.pin.add(imgResponse[0].path);
            console.log("img ping success");
            let imgIpfsAddress = imgResponse[0].path;
            // 元数据上传ipfs
            const reqdataRet = JSON.parse(premetadata.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
            const reqdata = {};
            // const reqdata = JSON.parse(JSON.stringify(premetadata));
            reqdata.fileName = tempPath.substring(tempPath.lastIndexOf("/") + 1);
            reqdata.image = "https://dream.chaonft.cn/ipfs/api/v0/cat/" + imgIpfsAddress;
            reqdata.subject = reqdataRet.title
            reqdata.author = reqdataRet.author
            reqdata.authorDescription = reqdataRet.authorDesc;
            reqdata.description = reqdataRet.desc;
            reqdata.flydate = "Summer 2022"
            reqdata.data = reqdataRet;
            let response = await ipfsNode
                .add(Buffer.from(JSON.stringify(reqdata), "utf-8"))
                .then((response) => {
                    return response;
                })
                .catch((err) => {
                    console.error(responseFunStr(500, err, {}), id);
                });
            console.log("metaData:", response[0].path);
            try {
                ipfsNode.pin.add(response[0].path);
                tokenURI = response[0].path;
                // 设置一个新值，返回交易
                // save db
                let nft = {
                    isFinish: 0,
                    tokenId: tokenId,
                    imgPath: reqdata.image,
                    metaData: response[0].path,
                    metaDataSource: JSON.stringify(reqdata),
                    hash: "",
                    status: 6, // 资源已上传ipfs,未上链
                };
                let result = nftUpdateSelective(nft);
                let dbOp = await result
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(responseFunStr(500, err, ""), id);
                    });
                console.info(responseFunStr(200, ""), id);
            } catch (e) {
                console.error(responseFunStr(500, e, ""), id);
            }
        } else {
            console.log("ipfs upload err:", imgResponseRet.err)
        }
    }
    console.log("fileUploadIpfs All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("fileUploadIpfs Start !!")
        fileUploadIpfs()
    }, 2000)
}

const {
    queryNonce,
    insertNonce,
    updateNonce,
    delNonce
} = require("../mapper/NftNonceMapper");

let gasPrice = "5000100000000";
let isGasPrice = false;

async function betchMint() {
    let nfts = nftSelectSelectiveStatus(6); // 资源未上链ipfs的条目
    let nftArr = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.error(responseFunStr(500, err, {}));
        });
    for (let retKey in nftArr) {
        // console.log(ret[retKey]);
        const {
            address,
            imgPath,
            collectAddress,
            metaData,
            metaDataSource,
            tokenId,
            supply,
            nonce,
            type,
        } = nftArr[retKey];
        let accountDetail = accountSelectSelective(address);
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
        let transferTo = address;
        let signatures = [];
        let minter = address;
        var creators = Part(minter, 10000);
        let transactionCount1Mint;
        //     await customHttpProvider.getTransactionCount(address, "latest");
        var nonceResult = await queryNonce(address);
        let currTime = new Date().getTime();
        if (nonceResult.length == 0) {
            transactionCount1Mint =
                await customHttpProvider.getTransactionCount(address, "latest");
            await insertNonce(address, transactionCount1Mint);
        } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
            // 超时,重新获取nonce
            console.log("超时,重新获取nonce.....................");
            transactionCount1Mint =
                await customHttpProvider.getTransactionCount(address, "latest");
            await updateNonce(address, transactionCount1Mint);
        } else {
            transactionCount1Mint = nonceResult[0].nonce;
        }
        console.log("address: " + address);
        // console.log("发送交易总数1: " + transactionCount1Mint);
        console.log("nonce: " + nonce);
        let tokenURI = metaData;
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
        if (type == 10 || type == 12) {
            let contract = new ethers.Contract(
                collectAddress,
                ERC1155Ctnft.abi,
                customHttpProvider
            );

            if (collectAddress.toString().toLowerCase() == "0xA9d539e9B9B0d3885bC2056C9482B2aE7277a1Da".toLowerCase()) {
                tokenURI = "/" + tokenURI;
            }
            // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
            let contractWithSigner = contract.connect(wallet);
            let gasLimitRet = await contractWithSigner.estimateGas
                .mintAndTransfer(
                    Mint1155Data(tokenId, tokenURI, supply, [creators], [], [signatures]),
                    transferTo,
                    supply
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
                if (gasLimitRet.err == minted1155TokenStr) {
                    await nftUpdateSelectiveStatus(7, tokenId); // 已经被铸造, 但是获取不到hash
                } else if ("replacement fee too low" == gasLimitRet.err) {
                    await updateNonce(address, transactionCount1Mint + 1);
                }
                continue;
            } else {
                console.log("gasLimit:", gasLimit.toString());
                let neceliby = ethers.utils.formatEther((gasPrice * gasLimit).toString());
                console.log("gasPrice*:", neceliby);
                let balance = await wallet.provider.getBalance(address);
                // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                let etherString = ethers.utils.formatEther(balance);
                console.log("Balance: ", etherString);
                if (Number(balance) < Number("1000000000000000000")) {
                    console.log("合约持有者余额不足, 请进行充值!");
                    await delNonce(address);
                    continue;
                } else {
                    let overrides = {
                        // The maximum units of gas for the transaction to use
                        // gasLimit: web3.utils.numberToHex(gasLimit),
                        // The price (in wei) per unit of gas
                        // gasPrice: web3.utils.numberToHex(gasPrice),
                        // The nonce to use in the transaction
                        // nonce: nonce,
                        nonce: transactionCount1Mint,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                    };


                    // 设置一个新值，返回交易
                    let txRet = await contractWithSigner
                        .mintAndTransfer(
                            Mint1155Data(tokenId, tokenURI, supply, [creators], [], [signatures]),
                            transferTo,
                            supply,
                            overrides
                        )
                        .then((ret) => {
                            // return ret;
                            return {err: null, data: ret};
                        })
                        .catch((err) => {
                            return {err: err.reason, data: null};
                        });
                    // console.log("tx:", tx.toString().startsWith('0x'))
                    // console.log("tx:", tx);
                    let tx = txRet.data;
                    if (
                        tx == null && minted1155TokenStr == txRet.err
                    ) {
                        console.log("tx:", tx.hash);
                        let nft = {
                            isFinish: 1,
                            hash: tx.hash,
                            status: 7, // 上链成功
                            imgPath,
                            metaData,
                            metaDataSource,
                            tokenId,
                        };
                        console.log("nftUpdateSelective:", nft);
                        let result = await nftUpdateSelective(nft)
                            .then((ret) => {
                                return ret;
                            })
                            .catch((err) => {
                                console.error(responseFun(500, err, ""), tokenId);
                            });
                        console.log("update NFT data:", result);
                        console.info(responseFunStr(200, "", {tokenId: tokenId}), tokenId);
                        continue;
                    } else if (tx != null) {
                        // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364

                        console.log("hash:", tx.hash);
                        // 操作还没完成，需要等待挖矿
                        // let recept = await customHttpProvider
                        //     .waitForTransaction(tx.hash)
                        //     .then((ret) => {
                        //         return ret;
                        //     })
                        //     .catch((err) => {
                        //         console.log("err:", err);
                        //     });
                        // console.log(recept);
                        // if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                        //     throw {message: "Transaction Reverted"};
                        // }

                        // let recept1 = await tx.wait();
                        // save db
                        let nft = {
                            isFinish: 1,
                            hash: tx.hash,
                            status: 10, // 上链成功
                            imgPath,
                            metaData,
                            metaDataSource,
                            tokenId,
                        };
                        console.log("nftUpdateSelective:", nft);
                        let result = await nftUpdateSelective(nft)
                            .then((ret) => {
                                return ret;
                            })
                            .catch((err) => {
                                console.error(responseFun(500, err, ""), tokenId);
                            });
                        console.log("update NFT data:", result);
                        console.info(responseFunStr(200, "", {tokenId: tokenId}), tokenId);
                        await updateNonce(address, transactionCount1Mint + 1);
                    } else if ("replacement fee too low" == txRet.err) {
                        //手续费不足
                        await updateNonce(address, transactionCount1Mint + 1);
                    } else {
                        //手续费不足
                        console.error("txRet.err", txRet.err);
                        await delNonce(address);
                    }
                }
            }

        } else if (type == 9) {
            let contract = new ethers.Contract(
                collectAddress,
                ERC721Ctnft.abi,
                customHttpProvider
            );
            let contractWithSigner = contract.connect(wallet);
            let gasLimitRet = await contractWithSigner.estimateGas
                .mintAndTransfer(
                    Mint721Data(tokenId, tokenURI, [creators], [], [signatures]),
                    transferTo
                )
                .then((ret) => {
                    return {err: null, gasLimit: ret}
                })
                .catch(async (err) => {
                    console.error("err:", err.reason);
                    return {err: err.reason, gasLimit: null}
                });

            let gasLimit = gasLimitRet.gasLimit;
            if (gasLimit == null) {
                // console.log(minted721TokenStr == gasLimitRet.err)
                if (minted721TokenStr == gasLimitRet.err) {
                    await nftUpdateSelectiveStatus(7, tokenId); // 已经被铸造, 但是获取不到hash
                } else if ("replacement fee too low" == gasLimitRet.err) {
                    await updateNonce(address, transactionCount1Mint + 1);
                }
                continue;
            } else {
                console.log("gasLimit:", gasLimit.toString());
                let neceliby = gasPrice * gasLimit;
                neceliby = neceliby + 1000000000000000000;
                console.log("gasPrice*:", gasPrice * gasLimit);
                let balance = await wallet.provider.getBalance(address);
                // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                // let etherString = ethers.utils.formatEther(balance);
                console.log("Balance: ", balance);
                if (Number(balance) < Number("1000000000000000000")) {
                    //    赠送手续费 20
                    let neceliby1 = ethers.utils.parseEther(20 + '');

                    let {err, hash} = await transfer(neceliby1 + "", address);
                    if (err != null) {
                        //
                        console.log("txTransfer faild");
                        continue;
                    }
                    console.log("tx Hash:", hash);
                }
                console.log("nonce: " + nonce);
                console.log("nonce: " + transactionCount1Mint);
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
                let txRet = await contractWithSigner
                    .mintAndTransfer(
                        Mint721Data(tokenId, tokenURI, [creators], [], [signatures]),
                        transferTo,
                        overrides
                    )
                    .then((ret) => {
                        // return ret;
                        return {err: null, data: ret};
                    })
                    .catch((err) => {
                        return {err: err.reason, data: null};
                    });
                // console.log("tx:", tx.toString().startsWith('0x'))
                // console.log("tx:", tx);
                let tx = txRet.data;
                if (
                    tx == null && minted721TokenStr == txRet.err
                ) {

                    let nft = {
                        isFinish: 1,
                        hash: tx.hash,
                        status: 7, // 上链成功
                        imgPath,
                        metaData,
                        metaDataSource,
                        tokenId,
                    };
                    await nftUpdateSelective(nft)
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.error(responseFun(500, err, ""), tokenId);
                        });
                    console.info(responseFunStr(200, "", {tokenId: tokenId}), tokenId);
                    continue;
                } else if (tx != null) {
                    // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364
                    console.log("hash:", tx.hash);
                    // 操作还没完成，需要等待挖矿
                    // let recept = await customHttpProvider
                    //     .waitForTransaction(tx.hash)
                    //     .then((ret) => {
                    //         return ret;
                    //     })
                    //     .catch((err) => {
                    //         console.log("err:", err);
                    //     });
                    // console.log(recept);
                    // if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                    //     throw {message: "Transaction Reverted"};
                    // }

                    // let recept1 = await tx.wait();
                    // save db
                    let nft = {
                        isFinish: 1,
                        hash: tx.hash,
                        status: 10, // 上链成功
                        imgPath,
                        metaData,
                        metaDataSource,
                        tokenId,
                    };
                    let result = await nftUpdateSelective(nft)
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.error(responseFun(500, err, ""), tokenId);
                        });
                    console.info(responseFunStr(200, "", {tokenId: tokenId}), tokenId);
                    await updateNonce(address, transactionCount1Mint + 1);
                } else if ("replacement fee too low" == txRet.err) {
                    //手续费不足
                    await updateNonce(address, transactionCount1Mint + 1);
                } else {
                    //手续费不足
                    console.error("txRet.err", txRet.err);
                    await delNonce(address);
                }
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
    console.log("betchMint All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchMint Start !!")
        betchMint()
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
    let nfts = nftSelectSelectiveStatus(7); // 上链成功  没有回调的
    let nftArr = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.error(responseFunStr(500, err, {}));
        });
    for (let retKey in nftArr) {
        let {tokenId, update_time, hash, rebackUrl} = nftArr[retKey];
        var formdata = new FormData();
        formdata.append("key", "qianyidata");
        // console.log(tokenId)
        formdata.append("tokenId", tokenId);
        formdata.append("mintDate", formatTime(update_time));
        formdata.append("status", "true");
        formdata.append("hash", hash);
        console.log("formatTime(update_time)", formatTime(update_time))
        var requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow",
        };

        if (rebackUrl == ''
            || rebackUrl == null
            || rebackUrl == undefined) {
            let responseChanel1 = await fetch(reCallUrlChanel1, {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify({
                    'key': 'qianyidata',
                    'tokenId': tokenId,
                    'mintDate': formatTime(update_time),
                    "status": true,
                    "hash": hash,
                })
            })
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
                    console.log("回调错误:", err, ",tokenId", tokenId);
                    return {data: null, err: err};
                });
            //处理响应结果
            console.log(responseChanel1);
            if (responseChanel1 == null) {
                await nftUpdateSelectiveStatus(9, tokenId);
                continue;
            } else if (responseChanel1.code == 200) {
                await nftUpdateSelectiveStatus(1, tokenId);              // 设置为回调成功状态
            } else {
                await nftUpdateSelectiveStatus(9, tokenId);
                continue;
            }
        } else {
            let responseRet = await fetch(rebackUrl, requestOptions)
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
                    console.log("回调错误:", err, ",tokenId", tokenId);
                    return {data: null, err: err};
                });
            //处理响应结果
            let response = responseRet.data
            console.log(response);
            if (response == null) {
                await nftUpdateSelectiveStatus(9, tokenId);
                continue;
            } else if (response.status && response.status == 1) {
                await nftUpdateSelectiveStatus(1, tokenId)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(responseFun(500, err, ""), tokenId);
                    }); // 设置为回调成功状态
            } else {
                await nftUpdateSelectiveStatus(9, tokenId);
                continue;
            }
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
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`

}

async function betchHashQuery() {
    let nfts = nftSelectSelectiveStatus(10); // 上链成功  没有回调的
    let transList = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    for (let retKey in transList) {
        console.log(transList[retKey]);
        let {tokenId, update_time, hash, rebackUrl} = transList[retKey];
        if (!hash || hash == "" || hash == null) {
            continue;
        }
        // let recept = await customHttpProvider.getTransactionReceipt(hash);
        let req_url = "https://ctblock.cn/graphiql";
        let receptRet = await graphiqlHashQuery(hash);
        let recept = receptRet.data;
        if (recept == null) {
            console.log(recept.err);
            continue;
        } else {
            console.log(recept);
            // console.log(recept);

            // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
            // save db
            let t_statusStorage;
            if (recept.data.transaction == null) {
                // t_statusStorage = 7;
                formatTime(new Date());
                console.log("查询hash结果为空,", hash);
                continue;
            } else {
                if (recept.data.transaction.status == "ERROR") {
                    console.log("hash出错:", recept.data.transaction);
                    if ("dropped/replaced" == recept.data.transaction.error) {
                        t_statusStorage = 6;
                    } else {
                        t_statusStorage = 8;
                    }

                } else if (recept.data.transaction.status == "OK") {
                    t_statusStorage = 7;
                } else {
                    continue;
                }
            }

            await nftUpdateSelectiveStatus(t_statusStorage, tokenId);
        }

    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery()
    }, 2000)
}

//TEST
fileUploadIpfs();
// test();
betchMint();
betchHashQuery()
betchCallFund();

module.exports = {
    fileUploadIpfs
};

// node src\task\mintTask.js