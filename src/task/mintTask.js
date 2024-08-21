import {validate} from "../routers/fcommon";

const {isEmpty} = require("../rules/rules");
const GlobalConfig = require("../config/GlobalConfig.json");
const FormData = require("form-data");
const gasConfig = require("../config/gasConfig.json");
const Web3 = require("web3");
let web3 = new Web3(GlobalConfig.BLOCK_CHAIN.RPC_URL[1].url);
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem, getKeys,
} = require("../redis/redis-client");
const fetch = require("node-fetch");

let reCallUrlChanel1 = "http://nft.richonn.com/home/nft/casting";

const ABI_const = require("../contract/ABI_const.js");
const ethers = require("ethers");
const {contract_static_call} = require("../contract/ChainCall");
const {responseFunStr} = require("../mapper/account");
const {getPriKey} = require("../chain/accountProUtils");
const {PasswordError} = require("../chain/responseError");
const {customHttpProvider} = require("./taskConst");
const {findAccount} = require("../Orm/AccountService");
let minted721TokenStr = "execution reverted: ERC721: token already minted";
let minted1155TokenStr = "execution reverted: more than supply";
const {Op} = require('sequelize')


// 创建一个Provider（你可以连接到一个特定的以太坊节点，或使用默认的Infura/Alchemy等）
const provider = new ethers.providers.JsonRpcProvider(GlobalConfig.BLOCK_CHAIN.RPC_URL[1].url);

// 获取账户的 nonce
async function getNonce(address) {
    let nonce = await getString(address + '_NONCE');
    if (Number(nonce) > 0) {
        nonce = Number(nonce) + 1;
        await setString(address + '_NONCE', nonce, 4)  // 5s

    } else {
        nonce = await provider.getTransactionCount(address, "latest");
        console.log(address + "Nonce:", nonce);
        await setString(address + '_NONCE', nonce, 4)  // 5s
    }

    return nonce;
}

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

const mintFileUploadIpfsFlag = "mintFileUploadIpfs_START"

async function mintFileUploadIpfs() {

    if (await getString(mintFileUploadIpfsFlag) == "1") {
        console.log('===================wait start mintFileUploadIpfs')
        return
    } else {
        await setString(mintFileUploadIpfsFlag, "1", 60)
        console.time('mintFileUploadIpfs')

        const {create} = await import('ipfs-http-client')
        const client = create({
            timeout: 8000,
            protocol: GlobalConfig.IPFS[0].PROTOCOL,
            host: GlobalConfig.IPFS[0].HOST,
            port: GlobalConfig.IPFS[0].PORT,
            apiPath: GlobalConfig.IPFS[0].API_PATH,
            headers: {
                authorization: 'Basic ' + Buffer.from(GlobalConfig.IPFS[0].TOKEN).toString('base64')
            }
        })

        // 资源未上链ipfs的条目
        let nfts_ret = await findNft(_where = {status: 0})
        let nftArr = [];
        if (nfts_ret.code != 0) {
            console.trace(responseFunStr(500, nfts_ret.result, {}));
        } else {
            nftArr = nfts_ret.result;
        }

        for (let retKey in nftArr) {
            try {
            } catch (e) {
                console.trace(e);
                continue;
            }
            // console.log(nftArr[retKey]);
            let {id, premetadata, tokenId, tempPath} = nftArr[retKey];
            const searchRegExp = new RegExp('\\\\"', "g"); // // 抛出 SyntaxError 异常
            premetadata = premetadata.replace(searchRegExp, '"');

            let reqdataRet;

            try {
                reqdataRet = JSON.parse(
                    premetadata.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
                );
            } catch (e) {
                reqdataRet = JSON.parse(
                    premetadata.replace(/\\%/g, '%')
                );
            }

            console.log(reqdataRet)
            const reqdata = {};
            reqdata.fileName = tempPath.substring(tempPath.lastIndexOf("/") + 1);
            // reqdata.image =
            //     "https://dream.chaonft.cn/ipfs/api/v0/cat/" + imgIpfsAddress;
            reqdata.image = tempPath;
            reqdata.subject = reqdataRet.title;
            reqdata.author = reqdataRet.author;
            reqdata.authorDescription = reqdataRet.authorDesc;
            reqdata.description = reqdataRet.desc;
            reqdata.flydate = "Summer 2022";
            reqdata.data = reqdataRet;
            let response = await client
                .add(Buffer.from(JSON.stringify(reqdata), "utf-8"))
                .then((response) => {
                    return response;
                })
                .catch((err) => {
                    console.trace(responseFunStr(500, err, {}), id);
                });
            console.log("metaData:", response);
            try {
                let tokenURI = response.cid.toString();
                // 设置一个新值，返回交易
                // save db
                let nft = {
                    isFinish: 0,
                    imgPath: reqdata.image,
                    metaData: response.cid.toString(),
                    metaDataSource: JSON.stringify(reqdata),
                    hash: "",
                    status: 6, // 资源已上传ipfs,未上链
                };
                let result = await updateNft(_params = nft, _where = {tokenId: tokenId});
                if (result.code != 0) {
                    console.trace(responseFunStr(500, result.result, ""), id);
                }
                console.info(responseFunStr(200, ""), id);
            } catch (e) {
                console.trace(responseFunStr(500, e, ""), id);
            }
        }
        await removeString(mintFileUploadIpfsFlag)
        console.timeEnd('mintFileUploadIpfs')
    }
}

const mintBetchMintFlag = "mintBetchMint_START"

async function mintBetchMint() {

    if (await getString(mintBetchMintFlag) == "1") {
        console.log('===================wait start mintBetchMint')
        return
    } else {
        await setString(mintBetchMintFlag, "1", 60)

        console.time('mintBetchMint')
        let newVar = await getKeys("BALANCE_*");

        let andfrom = [];
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }

        let nfts_ret = await findNft(_where = {
            status: 6,
            address: {
                [Op.not]: andfrom
            }
        })
        let nftArr = [];
        if (nfts_ret.code != 0) {
            console.trace(responseFunStr(500, nfts_ret.result, {}));
        } else {
            nftArr = nfts_ret.result;
        }

        for (let retKey in nftArr) {
            console.log(nftArr[retKey]);
            try {
                const {
                    address,
                    imgPath,
                    collectAddress,
                    metaData,
                    metaDataSource,
                    tokenId,
                    supply,
                } = nftArr[retKey];
                let collectDetail_ret = await findCollect(_where = {address: collectAddress})
                if (collectDetail_ret.code != 0) {
                    console.trace("ERR:", collectDetail_ret.result);
                }

                let collectDetail = collectDetail_ret.result[0];
                let type = collectDetail.type;
                let isBal = await getString("BALANCE_" + collectDetail.owner)
                if (isBal == "1") {
                    await setString("BALANCE_" + collectRet.owner, "1", 120);  // 2 min
                    console.log("合约草田分余额不足:", collectDetail.owner)
                    break;
                }

                let accountDetail_ret = await findAccount(_where = {address: address})
                let accountItem = accountDetail_ret.result[0];
                // try {
                let wallet;

                if (type == 10) {
                    let contractAddressDetailAsync;

                    if (collectDetail.owner.toLowerCase() == address.toLowerCase()) {
                        contractAddressDetailAsync = accountItem;
                    } else {
                        let contractAddressDetailAsync_ret = await findAccount(_where = {address: collectDetail.owner})
                        contractAddressDetailAsync = contractAddressDetailAsync_ret.result[0]
                    }
                    let contractAddressDetail = contractAddressDetailAsync;
                    let decWalletResultq = await getPriKey(contractAddressDetail, contractAddressDetail.psd);
                    validate(decWalletResultq.err === null, PasswordError)
                    wallet = decWalletResultq.result;

                    let privateKeyA = wallet.privateKey
                    let {err, hash} = await transfer(
                        privateKeyA,
                        ethers.utils.parseEther(String(1.2)),
                        address,
                        wallet
                    );
                    if (err != null) {
                        console.log("txTransfer faild");
                        continue
                    }
                    console.log("tx Hash:", hash);
                }

                let decWalletResult = await getPriKey(accountItem, accountItem.psd);
                validate(decWalletResult.err === null, PasswordError)
                wallet = decWalletResult.result;
                wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

                // 使用Provider 连接合约，将只有对合约的可读权限
                let transferTo = address;
                let signatures = [];
                let minter = address;
                var creators = Part(minter, 10000);

                let tokenURI = metaData;

                if (type == 10 || type == 12) {
                    let contract = new ethers.Contract(
                        collectAddress,
                        ABI_const["ERC1155Ctnft"].abi,
                        customHttpProvider
                    );

                    if (
                        collectAddress.toString().toLowerCase() ==
                        "0xA9d539e9B9B0d3885bC2056C9482B2aE7277a1Da".toLowerCase()
                    ) {
                        tokenURI = "/" + tokenURI;
                    }
                    // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
                    let contractWithSigner = contract.connect(wallet);
                    let gasLimitRet = await contractWithSigner.estimateGas
                        .mintAndTransfer(
                            Mint1155Data(
                                tokenId,
                                tokenURI,
                                supply,
                                [creators],
                                [],
                                [signatures]
                            ),
                            transferTo,
                            supply
                        )
                        .then((ret) => {
                            return {err: null, gasLimit: ret};
                        })
                        .catch((err) => {
                            console.trace("err:", err.reason);

                            return {err: err.reason, gasLimit: null};
                        });
                    let gasLimit = gasLimitRet.gasLimit;
                    if (gasLimit == null) {
                        if (gasLimitRet.err == minted1155TokenStr) {
                            await updateNft(_params = {status: 7}, _where = {tokenId: tokenId});
                            // 已经被铸造, 但是获取不到hash
                        } else if ("replacement fee too low" == gasLimitRet.err) {
                            // await updateNonce(address, transactionCount1Mint + 1);
                        } else if (gasLimitRet.err == 'execution reverted: ERC1155: mint is not owner') {
                            // up chain faild
                            await updateNft(_params = {status: 8}, _where = {tokenId: tokenId});
                        } else {
                            // await delNonce(address);
                        }
                        continue;
                    } else {
                        console.log("gasLimit:", gasLimit.toString());
                        let neceliby = ethers.utils.formatEther(
                            gasConfig.mint1155.gas.toString()
                        );
                        console.log("gasPrice*:", neceliby);
                        let balance = await wallet.provider.getBalance(address);
                        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                        let etherString = ethers.utils.formatEther(balance);
                        console.log("Balance: ", etherString);
                        if (Number(etherString) < Number(String(10))) {
                            // 合约持有者余额不足十个,将进行充值 1155铸造者
                            console.log("合约持有者余额不足, 请进行充值!", address);
                            await setString("BALANCE_" + address, "1", 300);
                            // await delNonce(address);
                            continue;
                        } else {
                            let overrides = {
                                // The maximum units of gas for the transaction to use
                                gasLimit: Web3.utils.numberToHex(gasLimit),
                                // The price (in wei) per unit of gas
                                // gasPrice: Web3.utils.numberToHex(
                                //     parseInt(gasConfig.mint1155.gas / Number(gasLimit))
                                // ),
                                // The nonce to use in the transaction
                                // nonce: nonce,
                                // nonce: transactionCount1Mint,
                                // The amount to send with the transaction (i.e. msg.value)
                                // value: utils.parseEther('1.0'),
                                // The chain ID (or network ID) to use
                                // chainId: 27
                            };

                            // 设置一个新值，返回交易
                            let txRet = await contractWithSigner
                                .mintAndTransfer(
                                    Mint1155Data(
                                        tokenId,
                                        tokenURI,
                                        supply,
                                        [creators],
                                        [],
                                        [signatures]
                                    ),
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
                            if (tx == null && minted1155TokenStr == txRet.err) {
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
                                let result = await updateNft(_params = nft, _where = {tokenId: tokenId});

                                if (result.code != 0) {
                                    console.trace(responseFun(500, result.result, ""), tokenId);
                                }
                                console.log("update NFT data:", result);
                                console.info(
                                    responseFunStr(200, "", {tokenId: tokenId}),
                                    tokenId
                                );
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
                                //     throw  "Transaction Reverted";
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
                                let result = await updateNft(_params = nft, _where = {tokenId: tokenId});

                                if (result.code != 0) {
                                    console.trace(responseFun(500, result.result, ""), tokenId);
                                }
                                console.log("update NFT data:", result);
                                console.info(
                                    responseFunStr(200, "", {tokenId: tokenId}),
                                    tokenId
                                );
                                // await updateNonce(address, transactionCount1Mint + 1);
                            } else if ("replacement fee too low" == txRet.err) {
                                //手续费不足
                                // await updateNonce(address, transactionCount1Mint + 1);
                            } else {
                                //手续费不足
                                console.trace("txRet.err", txRet.err);
                                // await delNonce(address);
                            }
                        }
                    }
                } else if (type == 9) {
                    let contract = new ethers.Contract(
                        collectAddress,
                        ABI_const["ERC721Ctnft"].abi,
                        customHttpProvider
                    );
                    let contractWithSigner = contract.connect(wallet);
                    let gasLimitRet = await contractWithSigner.estimateGas
                        .mintAndTransfer(
                            Mint721Data(tokenId, tokenURI, [creators], [], [signatures]),
                            transferTo
                        )
                        .then((ret) => {
                            return {err: null, gasLimit: ret};
                        })
                        .catch(async (err) => {
                            console.trace("err:", err.reason);
                            return {err: err.reason, gasLimit: null};
                        });

                    let gasLimit = gasLimitRet.gasLimit;
                    if (gasLimit == null) {
                        // console.log(minted721TokenStr == gasLimitRet.err)
                        if (minted721TokenStr == gasLimitRet.err) {
                            await updateNft(_params = {status: 7}, _where = {tokenId: tokenId});
                            // 已经被铸造, 但是获取不到hash
                        } else if ("replacement fee too low" == gasLimitRet.err) {
                            // await updateNonce(address, transactionCount1Mint + 1);
                        } else {
                            // await delNonce(address);
                        }
                        continue;
                    } else {
                        console.log("gasLimit:", gasLimit.toString());
                        let neceliby = ethers.utils.formatEther(
                            gasConfig.mint721.gas.toString()
                        );
                        console.log("gasPrice*:", neceliby);
                        console.log("gasPrice*:", gasConfig.mint721.gas);


                        let balance = await wallet.provider.getBalance(address);
                        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                        let etherString = ethers.utils.formatEther(balance);
                        console.log("Balance: ", etherString);

                        if (Number(etherString) < Number(String(1.5))) {

                            let contractAddressDetailAsync;

                            if (collectDetail.owner.toLowerCase() == address.toLowerCase()) {
                                contractAddressDetailAsync = accountItem;
                            } else {
                                let sUserAccountDetail01 = await findAccount(_where = {address: collectDetail.owner})
                                if (sUserAccountDetail01.code === 0) {
                                    if (sUserAccountDetail01.result.length == 0) {
                                        await updateNft(_params = {status: 8}, _where = {tokenId: tokenId});
                                        // up chain faild.
                                        continue;
                                    }

                                    contractAddressDetailAsync = sUserAccountDetail01.result[0]
                                }
                            }
                            let contractAddressDetail = contractAddressDetailAsync;
                            let isBal = await getString("BALANCE_" + collectDetail.owner)
                            if (isBal == "1") {
                                console.log("合约草田分余额不足:", collectDetail.owner)
                                continue;
                            }
                            let decWalletResult1 = await getPriKey(
                                contractAddressDetailAsync,
                                contractAddressDetailAsync.psd
                            );
                            let wallet1;
                            if (decWalletResult1.err != null) {
                                return PasswordError;
                            } else {
                                wallet1 = decWalletResult1.result;
                            }
                            contractAddressDetail.private_key = wallet1.privateKey;

                            if (  // 判断是否是项目方
                                contractAddressDetail.address.toLowerCase() == address.toLowerCase() && Number(etherString) < Number(String(10))
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


                            let privateKeyA = contractAddressDetail.private_key;
                            if (isEmpty(privateKeyA).flag) {
                                continue;
                            } else {

                                let {err, hash} = await transfer(
                                    privateKeyA,
                                    ethers.utils.parseEther(String(1.5)),
                                    address,
                                    wallet
                                );
                                if (err != null) {
                                    console.log("txTransfer faild");
                                    continue;
                                }
                                console.log("tx Hash:", hash);
                                continue;

                            }
                        }
                        let nonce = await getNonce(wallet.address);
                        let overrides = {
                            // The maximum units of gas for the transaction to use
                            gasLimit: Web3.utils.numberToHex(gasLimit),
                            // The price (in wei) per unit of gas
                            // gasPrice: Web3.utils.numberToHex(
                            //     parseInt(gasConfig.mint721.gas / Number(gasLimit))
                            // ),
                            // The nonce to use in the transaction
                            nonce: nonce,
                            // nonce: transactionCount1Mint,
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
                        if (tx == null && minted721TokenStr == txRet.err) {
                            let nft = {
                                isFinish: 1,
                                hash: tx.hash,
                                status: 7, // 上链成功
                                imgPath,
                                metaData,
                                metaDataSource,
                                tokenId,
                            };
                            let result = await updateNft(_params = nft, _where = {tokenId: tokenId});

                            if (result.code != 0) {
                                console.trace(responseFun(500, result.result, ""), tokenId);
                            }

                            console.info(
                                responseFunStr(200, "", {tokenId: tokenId}),
                                tokenId
                            );
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
                            //     throw  "Transaction Reverted";
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
                            let result = await updateNft(_params = nft, _where = {tokenId: tokenId});

                            if (result.code != 0) {
                                console.trace(responseFun(500, result.result, ""), tokenId);
                            }
                            console.info(
                                responseFunStr(200, "", {tokenId: tokenId}),
                                tokenId
                            );
                            // await updateNonce(address, transactionCount1Mint + 1);
                        } else if ("replacement fee too low" == txRet.err) {
                            //手续费不足
                            // await updateNonce(address, transactionCount1Mint + 1);
                        } else {
                            //手续费不足
                            console.trace("txRet.err", txRet.err);

                            // await delNonce(address);
                        }
                    }
                } else if (type == 1) {
                    // 1155
                    let contract = new ethers.Contract(
                        collectAddress,
                        ABI_const["CtnftMToken"].abi,
                        customHttpProvider
                    );
                    console.log("ERROR:", "no implements");
                } else {
                    console.log("ERROR:", "没有找到匹配的合约信息");
                }
            } catch (e) {
                console.trace(e);
                continue;
            }
        }
        await removeString(mintBetchMintFlag)
        console.timeEnd('mintBetchMint')
    }
}

const ethUtil = require("ethereumjs-util");
const EIP712 = require("../routers/EIP712");
const sigUtil = require("eth-sig-util");
const {formatTime} = require("./taskConst");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findCollect} = require("../Orm/CollectService");
const {createNftTransaction} = require("../Orm/NftTransactionService");
const {findNft, updateNft} = require("../Orm/NftService");
const {updateTransFormList} = require("../Orm/TransFormListService");

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
    privateKeyStr = Web3.utils.stripHexPrefix(privateKeyStr);

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
        origin_data: JSON.stringify(origin_data_json),
        // origin_data: origin_data_json,
        contract_address: contractAddress,
        method:
            ABI_const["AuthController"].contractName +
            "#" +
            "authentication",
        origin_value: "0",
    }
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
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
    let isAuth = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthControllerV2"].abi,
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
    let nonce = await getNonce(walletSys.address);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        nonce: nonce,
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
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
        // if("INSUFFICIENT_FUNDS" == txRet.err.code) {
        //     await setString("BALANCE_" + contractAddressDetail.address, false, 300)
        //     // 跳出, 重新查询数据
        //     console.log("草田分余额不足:", contractAddressDetail.address)
        //     continue;
        // }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.trace("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

const mintBetchHashQueryFlag = "mintBetchHashQuery_START"

async function mintBetchHashQuery() {
    if (await getString(mintBetchHashQueryFlag) == "1") {
        console.log('===================wait start mintBetchHashQuery')
        return
    } else {
        await setString(mintBetchHashQueryFlag, "1", 60)

        console.time('mintBetchHashQuery')

        let transList = await findNft(_where = {status: 10})
        // 上链成功  没有回调的
        for (let retKey in transList.result) {
            try {
                let {tokenId, update_time, hash, rebackUrl, address, id} =
                    transList.result[retKey];
                if (!hash || hash == "" || hash == null) {
                    continue;
                }
                // let recept = await customHttpProvider.getTransactionReceipt(hash);
                let recept = await web3.eth.getTransactionReceipt(hash);
                let currTime = new Date().getTime();

                if (currTime - update_time.getTime() < 10000) {
                    // hash产生不到10s自动跳过
                    continue;
                } else {
                    let t_statusStorage;
                    if (recept != null && recept.status == true) {
                        t_statusStorage = 7;
                    } else {
                        if (currTime - update_time.getTime() < 60000) {
                            continue;
                        } else {
                            // await delNonce(address);
                            t_statusStorage = 6;
                        }
                    }
                    await updateNft(_params = {status: t_statusStorage}, _where = {tokenId: tokenId});
                }
            } catch (e) {
                console.trace(e);
                continue;
            }
        }
        await removeString(mintBetchHashQueryFlag)
        console.timeEnd('mintBetchHashQuery')
    }
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const mintBetchCallFundFlag = "mintBetchCallFund_START";

async function mintBetchCallFund() {
    if (await getString(mintBetchCallFundFlag) == "1") {
        console.log('===================wait start mintBetchCallFund')
        return
    } else {
        await setString(mintBetchCallFundFlag, "1", 60)

        console.time('mintBetchCallFund')
        let nftArr = await findNft(_where = {status: 7})
        // 上链成功  没有回调的

        for (let retKey in nftArr.result) {
            try {
                let {tokenId, update_time, hash, rebackUrl} = nftArr.result[retKey];
                var formdata = new FormData();
                formdata.append("key", "qianyidata");
                // console.log(tokenId)
                formdata.append("tokenId", tokenId);
                formdata.append("mintDate", formatTime(update_time));
                formdata.append("status", "true");
                formdata.append("hash", hash);
                console.log("formatTime(update_time)", formatTime(update_time));
                var requestOptions = {
                    method: "POST",
                    body: formdata,
                    headers: {
                        "Content-Type": `multipart/form-data; boundary=${formdata.getBoundary()}`
                    },
                    redirect: "follow",
                };

                if (rebackUrl == "" || rebackUrl == null || rebackUrl == undefined || rebackUrl == reCallUrlChanel1) {
                    let responseChanel1 = await fetch(reCallUrlChanel1, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        body: JSON.stringify({
                            key: "qianyidata",
                            tokenId: tokenId,
                            mintDate: formatTime(update_time),
                            status: true,
                            hash: hash,
                        }),
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
                            console.trace("回调错误:", err, ",tokenId", tokenId);
                            return {data: null, err: err};
                        });
                    //处理响应结果
                    console.log(responseChanel1);
                    if (responseChanel1.data == null) {
                        await updateNft(_params = {status: 9}, _where = {tokenId: tokenId});

                        continue;
                    } else if (responseChanel1.data.code == 200) {
                        await updateNft(_params = {status: 1}, _where = {tokenId: tokenId});
                        // 设置为回调成功状态
                    } else {
                        await updateNft(_params = {status: 9}, _where = {tokenId: tokenId});

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
                            console.trace("回调错误:", err, ",tokenId", tokenId);
                            return {data: null, err: err};
                        });
                    //处理响应结果
                    let response = responseRet.data;
                    console.log(response);
                    if (response == null) {
                        await updateNft(_params = {status: 9}, _where = {tokenId: tokenId});

                        continue;
                    } else if (response.status && response.status == 1) {
                        await updateNft(_params = {status: 1}, _where = {tokenId: tokenId}); // 设置为回调成功状态
                    } else {
                        await updateNft(_params = {status: 9}, _where = {tokenId: tokenId});
                        continue;
                    }
                }
            } catch (e) {
                console.trace(e);
                continue;
            }
        }
        await removeString(mintBetchCallFundFlag)
        console.timeEnd('mintBetchCallFund')
    }
}

// mintFileUploadIpfs();
module.exports = {
    mintFileUploadIpfs,
    mintBetchMint,
    mintBetchHashQuery,
    mintBetchCallFund
};
