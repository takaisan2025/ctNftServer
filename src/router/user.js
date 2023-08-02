const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const EIP712 = require("./EIP712");
const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
const {
    nftSelectSelective,
    exec_sql,
    nftSelectSelectiveCreator,
    nftInsertSelective,
    nftPreInsertSelective,
} = require("../controller/ctnft");
const {
    contract_call,
    contract_static_call,
} = require("../contract/ChainCall");
const requestIp = require("request-ip");
const {
    createCollectV1Erc1155,
    createCollectV1Erc1155Call,
    createCollectV2,
    createCollectV2Call,
    collectInit,
    collectInitCall,
    sendCTI,
} = require("./collect");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL,
    isEmpty,
} = require("../rules/rules");
const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
// const {
//   getString,
//   setString,
//   removeString,
//   rpush,
//   lrange,
//   lrem,
// } = require("../redis/redis-client");
// const gasConfig = require("../config/gasConfig.json");
const pino = require("pino");
// const expressPino = require('express-pino-logger');
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const xss = require("xss");
const ethers = require("ethers");
const fetch = require("node-fetch");
const formidable = require("formidable");
const GlobalConfig = require("../config/GlobalConfig.json");
const ABI_const = require("../contract/ABI_const.js");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const ipfsAPI = require("ipfs-api");
const ipfsNode = ipfsAPI({
    host: GlobalConfig.IPFS[0].HOST,
    port: GlobalConfig.IPFS[0].PORT,
    "api-path": GlobalConfig.IPFS[0].API_PATH,
    protocol: GlobalConfig.IPFS[0].PROTOCOL,
});
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(
    {
        ...rpc,
    },
    {
        chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
    }
);

const {
    balanceQuery,
    queryBalanceAndTokenBalance,
} = require("../chain/balanceQuery");

const {getPriKey} = require("../chain/accountProUtils");

const fs = require("fs");
const path = require("path");
let result = null;
// 非初始化合约地址设置
const ERC721CtnftExample = "0x0F4b3B9EcfD11444cB139dB98DB9aB0Ec417705E";
const ERC1155CtnftExample = "0xeB3AD009272D6C5f045f3d5EaD0ef0e47930877d";
const ERC1155CtnftOwnerExample = "0xbE23EBD6fC9b07945251382A8db82C477ddd5683";
let collectAddressExample = {
    9: ERC721CtnftExample,
    10: ERC1155CtnftExample,
    12: ERC1155CtnftOwnerExample,
};
let gasPrice = "5000100000000";
let isGasPrice = false;
var util = require("ethereumjs-util");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {PasswordEmpty} = require("../chain/responseError");
const {PasswordError} = require("../chain/responseError");
const {RESPONSE_STATUS} = require("../chain/responseError");

/**
 * 保存文件
 */
function saveFile(file) {
    // 读文件
    fs.readFile(file.filepath, (err, data) => {
        if (err) {
            return responseFun(RESPONSE_STATUS.ERROR, err, "");
        }
        const basePath = "./public/files";
        // 创建目录
        createDir(basePath);
        // 写入文件
        fs.writeFile(
            path.join(basePath, file.originalFilename),
            data,
            async (err) => {
                if (err) {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                }
                return responseFun(RESPONSE_STATUS.SUCCESS, "", "success");
            }
        );
    });
}

/**
 * 判断目录是否存在，不存在则创建
 * { recursive: true } 表示多层目录时递归创建
 */
function createDir(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {recursive: true});
    }
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

const handleUserRouter = async (req, res) => {
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
        // 单NFT铸造(同步)
        if (req.path === "/api/account/createctNft") {
            return new Promise((resolve, reject) => {
                // 创建表单解析对象
                const form = formidable({});
                form.parse(req, async (err, fields, files) => {
                    console.log("fields:", fields);
                    if (err) {
                        resolve(responseFun(400, "参数解析出错", ""));
                        return;
                    }

                    const file = files.file;

                    const {
                        address,
                        password,
                        title,
                        collectAddress,
                        desc,
                        author,
                        authorDesc,
                    } = fields;
                    if (isEmpty(password).flag) {
                        return PasswordEmpty;
                    }
                    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
                        address: address,
                    });
                    let result = await exec_sql(sqlResult.result);

                    // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                    return result.then(async (ret) => {
                        if (ret == null) {
                            return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                            return;
                        }
                        let wallet;
                        let decWalletResult = await getPriKey(ret, password);
                        if (decWalletResult.err != null) {
                            resolve(PasswordError);
                        } else {
                            wallet = decWalletResult.result;
                        }

                        try {
                            // address: wallet.address,
                            // privateKey: wallet.privateKey,
                            //    单个藏品铸造

                            const tokenId = address + "c1234567890" + Date.now();
                            var tokenURI = ""; //  这里需要传递过来我这边还是直接是个地址,这是一个问题
                            // 从私钥获取一个签名器 Signer
                            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
                            let balance = await wallet.provider.getBalance(address);
                            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                            let etherString = ethers.utils.formatEther(balance);
                            console.log("Balance: ", etherString);
                            let txTransfer = "";

                            if (etherString < 5) {
                                //    赠送手续费
                                let walletSys = new ethers.Wallet(
                                    privateKeySys,
                                    customHttpProvider
                                );
                                let tx = {
                                    to: address,
                                    // ... or supports ENS names
                                    // to: "ricmoo.firefly.eth",

                                    // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                                    // use this convenience function to convert ether to wei.
                                    value: ethers.utils.parseEther("5.0"),
                                };

                                txTransfer = await walletSys.sendTransaction(tx);
                                console.log("txTransfer:", txTransfer.hash);
                                // txTransfer.wait();

                                // console.log(txTransfer);
                            }
                            // 这里上传IPFS资源文件
                            // 图片资源上传ipfs
                            fs.readFile(file.filepath, (err, data) => {
                                ipfsNode
                                    .add(data)
                                    .then(async (imgResponse) => {
                                        console.log(imgResponse[0].path);
                                        //PIN
                                        ipfsNode.pin.add(imgResponse[0].path);
                                        let imgIpfsAddress = imgResponse[0].path;
                                        // 元数据上传ipfs
                                        const data = new Object();
                                        data.name = title;
                                        data.description = desc;
                                        data.image =
                                            "https://dream.chaonft.cn/ipfs/api/v0/cat/" +
                                            imgIpfsAddress;
                                        data.author = author;
                                        data.authorDesc = authorDesc;
                                        ipfsNode
                                            .add(Buffer.from(JSON.stringify(data), "utf-8"))
                                            .then(async (response) => {
                                                try {
                                                    ipfsNode.pin.add(response[0].path);

                                                    console.log(response[0].path);
                                                    if (txTransfer != "") {
                                                        await customHttpProvider.waitForTransaction(
                                                            txTransfer.hash
                                                        );
                                                    }
                                                    // 使用Provider 连接合约，将只有对合约的可读权限
                                                    let contract = new ethers.Contract(
                                                        collectAddress,
                                                        ABI_const["ERC721Ctnft"].abi,
                                                        customHttpProvider
                                                    );
                                                    // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
                                                    let contractWithSigner = contract.connect(wallet);
                                                    let transferTo = address;
                                                    let signatures = [];
                                                    let minter = address;
                                                    var creators = Part(minter, 10000);
                                                    // All overrides are optional
                                                    // let transactionCount1Tx1 = await customHttpProvider.getTransactionCount(address, "pending");
                                                    // console.log("发送交易总数: " + transactionCount);
                                                    // console.log("发送交易总数1: " + transactionCount1Tx1);
                                                    let overrides = {
                                                        // The maximum units of gas for the transaction to use
                                                        // gasLimit: 210000,
                                                        // The price (in wei) per unit of gas
                                                        // gasPrice: ethers.utils.parseUnits('5000.1', 'gwei'),
                                                        // The nonce to use in the transaction
                                                        // nonce: transactionCount1Tx1,
                                                        // The amount to send with the transaction (i.e. msg.value)
                                                        // value: utils.parseEther('1.0'),
                                                        // The chain ID (or network ID) to use
                                                        // chainId: 27
                                                    };
                                                    tokenURI = response[0].path;
                                                    // 设置一个新值，返回交易
                                                    let tx = await contractWithSigner.mintAndTransfer(
                                                        Mint721Data(
                                                            tokenId,
                                                            tokenURI,
                                                            [creators],
                                                            [],
                                                            [signatures]
                                                        ),
                                                        transferTo,
                                                        overrides
                                                    );

                                                    // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364
                                                    console.log(tx.hash);

                                                    // let transCount = await customHttpProvider.getTransactionCount(address, "latest");

                                                    // 操作还没完成，需要等待挖矿
                                                    let ret = await customHttpProvider.waitForTransaction(
                                                        tx.hash
                                                    );
                                                    // save db
                                                    let nft = {
                                                        address,
                                                        collectAddress,
                                                        isFinish: 1,
                                                        title,
                                                        status: 0, // 未上架
                                                        description: data.description,
                                                        tokenId: tokenId,
                                                        imgPath: data.image,
                                                        metaData: response[0].path,
                                                        metaDataSource: JSON.stringify(data).replace(
                                                            /&quot;/g,
                                                            '\\"'
                                                        ),
                                                        author,
                                                        authorDesc,
                                                        owner: address,
                                                        creator: address,
                                                        hash: tx.hash,

                                                        nonce: ret.nonce,
                                                    };
                                                    // console.log(nft)

                                                    let result = nftInsertSelective(nft);

                                                    return result
                                                        .then((ret) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                                                    hash: tx.hash,
                                                                })
                                                            );
                                                            return;
                                                        })
                                                        .catch((err) => {
                                                            resolve(
                                                                responseFun(RESPONSE_STATUS.ERROR, err, "")
                                                            );
                                                            return;
                                                        });
                                                } catch (e) {
                                                    resolve(
                                                        responseFun(RESPONSE_STATUS.ERROR, e.message, "")
                                                    );
                                                    return;
                                                }
                                            })
                                            .catch((err) => {
                                                resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                                return;
                                            });
                                    })
                                    .catch((err) => {
                                        resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                                        return;
                                    });
                            });
                        } catch (err) {
                            resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                            return;
                        }
                    });
                });
            });
        }

        // 查询和批量查询
        if (req.path === "/api/account/queryNft") {
            const {tokenIds} = req.body;
            const result = nftSelectSelective(tokenIds);
            return result
                .then((ret) => {
                    return responseFun(RESPONSE_STATUS.SUCCESS, "", ret);
                })
                .catch((err) => {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                });
        }

        // 查询 transaction
        if (req.path === "/api/account/queryTransaction") {
            const {orderId} = req.body;
            var sqlQueryByOrderId = get_mysql(
                "trans_form_list",
                "selectByOrderId",
                {
                    orderId: orderId,
                }
            ).result;
            let ex_orderId_ret = await exec_sql(sqlQueryByOrderId);
            console.log("query_orderId_ret:", ex_orderId_ret)
            if (ex_orderId_ret.result != null) {
                let statusDesc = '';
                switch (ex_orderId_ret.result.t_status) {
                    case 8: {
                        statusDesc = '初次回调失败'
                        break
                    }
                    case 18: {
                        statusDesc = '最终回调失败'
                        break
                    }
                    case 4: {
                        statusDesc = '回调成功'
                        break
                    }
                    case 6: {
                        statusDesc = '等待回调'
                        break
                    }
                    case 3: {
                        statusDesc = '交易上链失败'
                        break
                    }
                    default: {
                        statusDesc = '等待处理'
                        break
                    }
                }

                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    from: ex_orderId_ret.result.t_from,
                    to: ex_orderId_ret.result.t_to,
                    amount: ex_orderId_ret.result.amount,
                    token_id: ex_orderId_ret.result.token_id,
                    orderId: ex_orderId_ret.result.orderId,
                    hash: ex_orderId_ret.result.hash,
                    collectAddress: ex_orderId_ret.result.collectAddress,
                    status: ex_orderId_ret.result.t_status,
                    statusDesc: statusDesc,
                });
            } else {
                return responseFun(RESPONSE_STATUS.ERROR, "订单不存在!", "");
            }
        }

        // 查询 余额
        if (req.path === "/api/account/queryAccountBalance") {
            const {tokenId, address, collectAddress} = req.body;

            var balanceRet = await queryBalanceAndTokenBalance(
                address,
                collectAddress,
                tokenId
            );
            if (balanceRet.err != null) {
                throw err;
            } else {
                let mainBalance = ethers.utils.formatEther(
                    Web3.utils.hexToNumberString(balanceRet.data.balance)
                );
                let tokenBalance = Web3.utils.hexToNumberString(
                    balanceRet.data.tokenBalance
                );

                return responseFun(RESPONSE_STATUS.SUCCESS, "查询成功", {
                    balance: mainBalance,
                    tokenBalance: tokenBalance,
                });
            }
        }

        // 回调  TODO 这个可能需要考虑是否需要回调
        if (req.path === "/api/account/callFun") {
            const {tokenId, status, key} = req.body;
            return {code: 0};
        }

        if (req.path === "/api/private/dashboard") {
            let resultNFT = {};
            let resultTREANS = {};
            let result = {};

            // 等待上传ipfs
            let sql1 = "SELECT count(0) from nft where `status` = 0;";
            await exec_sql(sql1);
            resultNFT["等待上传ipfs"] = await exec_sql(sql1);
            // 等待上链
            let sql2 = "SELECT count(0) from nft where `status` = 6;";
            resultNFT["等待上链"] = await exec_sql(sql2);
            // 等待hash查询
            let sql3 = "SELECT count(0) from nft where `status` = 10;";
            resultNFT["等待hash查询"] = await exec_sql(sql3);
            // 上链成功
            let sql4 = "SELECT count(0) from nft where `status` = 7;";
            resultNFT["上链成功"] = await exec_sql(sql4);
            // 上链失败
            let sql5 = "SELECT count(0) from nft where `status` = 8;";
            resultNFT["上链失败"] = await exec_sql(sql5);
            // 回调失败
            let sql6 = "SELECT count(0) from nft where `status` = 9;";
            resultNFT["回调失败"] = await exec_sql(sql6);

            // 等待上链
            let sql7 = "SELECT count(0) from trans_form_list where `t_status` = 1;";
            resultTREANS["等待上链"] = await exec_sql(sql7);
            // 等待hash查询
            let sql8 = "SELECT count(0) from trans_form_list where `t_status` = 5;";
            resultTREANS["等待hash查询"] = await exec_sql(sql8);
            // 上链成功
            let sql9 = "SELECT count(0) from trans_form_list where `t_status` = 6;";
            resultTREANS["上链成功"] = await exec_sql(sql9);
            // 上链失败
            let sql10 = "SELECT count(0) from trans_form_list where `t_status` = 7;";
            resultTREANS["上链失败"] = await exec_sql(sql10);
            // 回调失败
            let sql11 = "SELECT count(0) from trans_form_list where `t_status` = 8;";
            resultTREANS["回调失败"] = await exec_sql(sql11);
            result = {
                NFT: resultNFT,
                TRANS: resultTREANS,
            };
            return responseFun(RESPONSE_STATUS.SUCCESS, null, result);
        }

        // 认证信息查询
        if (req.path === "/api/address/address_auth") {
            const {address} = req.body;
            if (!validateAddress(address).flag) {
                return responseFun(500, validateAddress(address).err, {});
            }

            let addressAuth = await getString("ADDRESS_AUTH_" + address);
            if (!isEmpty(addressAuth).flag) {
                return responseFun(RESPONSE_STATUS.SUCCESS, null, JSON.parse(addressAuth));
            }
            // 查询地址实名情况
            let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
            let parentauthsa = await contract_static_call(
                ethers,
                authContractAddress,
                ABI_const["AuthController"].abi,
                "parentauthsa",
                customHttpProvider,
                [address, 0]
            );

            // 将结果添加到redis  有效期五分钟
            let result;
            if (parentauthsa.data == null) {
                result = {
                    isAuth: false,
                }
            } else {
                result = {
                    isAuth: true,
                    parthAddr: parentauthsa.data
                }
            }
            console.log("parentauthsa:", result)
            await setString("ADDRESS_AUTH_" + address, JSON.stringify(result), 300)
            return responseFun(RESPONSE_STATUS.SUCCESS, null, result);
        }
    }
;

function callback(progress) {
    console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

async function transfer(value, toAddress) {
    let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: Web3.utils.numberToHex(value),
        // nonce: transactionCount1Mint,
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        console.log("recept1:", recept1);
        if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            throw "Transaction Reverted";
        }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

module.exports = handleUserRouter;
