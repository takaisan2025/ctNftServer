const {
    login,
    accountSelectSelective,
    accountInsertSelective,
    nftSelectSelective,
    execSql,
    execSqlAll,
    nftSelectSelectiveCreator,
    nftInsertSelective,
    nftPreInsertSelective,
    responseFun,
} = require("../controller/ctnft");
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
    checkURL
} = require("../rules/rules");
const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const xss = require("xss");
const ethers = require("ethers");
const fetch = require("node-fetch");
const formidable = require("formidable");
const GlobalConfig = require("../config/GlobalConfig.json");
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ERC1155CtnftOwner = require("../contract/ERC1155CtnftOwner.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri
const web3 = require("web3");
const ipfsAPI = require("ipfs-api");
const ipfsNode = ipfsAPI({
    host: GlobalConfig.IPFS[0].HOST,
    port: GlobalConfig.IPFS[0].PORT,
    "api-path": GlobalConfig.IPFS[0].API_PATH,
    protocol: GlobalConfig.IPFS[0].PROTOCOL,
});
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

const fs = require("fs");
const path = require("path");
const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml",
    "src/mapper/xml/TransFormListMapper.xml",
    "src/mapper/xml/NftUserAccesListMapper.xml",
    "src/mapper/xml/NftUserAddressListMapper.xml",
]);
let result = null;
// 非初始化合约地址设置
const ERC721CtnftExample = "0x0F4b3B9EcfD11444cB139dB98DB9aB0Ec417705E";
const ERC1155CtnftExample = "0xeB3AD009272D6C5f045f3d5EaD0ef0e47930877d";
const ERC1155CtnftOwnerExample = "0xbE23EBD6fC9b07945251382A8db82C477ddd5683";
let collectAddressExample = {
    "9": ERC721CtnftExample,
    "10": ERC1155CtnftExample,
    "12": ERC1155CtnftOwnerExample
}
let gasPrice = "5000100000000";
let isGasPrice = false;
var util = require('ethereumjs-util');


/**
 * 保存文件
 */
function saveFile(file) {
    // 读文件
    fs.readFile(file.filepath, (err, data) => {
        if (err) {
            return responseFun(500, err, "");
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
                    return responseFun(500, err, "");
                }
                return responseFun(200, "", "success");
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
    // 权限验证
    // var token = req.headers.token;
    // if (!token) {
    //     token = "";
    // }
    // var format = {language: "sql", indent: "  "};
    // var params = {token: token};
    // var sql = mybatisMapper.getStatement(
    //     "NftUserAccesListMapper",
    //     "selectByToken",
    //     params,
    //     format
    // );
    // let accessList = await execSqlAll(sql)
    //     .then((ret) => {
    //         return ret;
    //     })
    //     .catch((err) => {
    //         console.log("ERR:", err);
    //         return err;
    //     });
    //
    //
    // if (!accessList || accessList.length < 1) {
    //     return responseFun(401, {message: "没有权限访问!"}, {});
    // }

    //测试接口
    if (req.method === "POST" && req.path === "/api/user/login") {
        // 创建表单解析对象
        const form = formidable({});
        form.parse(req, (err, fields, files) => {
            if (err) {
                return responseFun(500, err, "");
            }
            const file = files.file;
            saveFile(file);
        });
    }

    // 管理用户相关开口开始 
    // 管理用户相关接口结束

    // 创建账户
    if (req.method === "POST" && req.path === "/api/account/createAccount") {
        const {password} = req.body;
        //
        let randomWallet = ethers.Wallet.createRandom();
        // let keystore = await randomWallet.encrypt(password, callback);
        //    save to db
        let account = {
            keystore: "none",
            address: randomWallet.address,
            status: 1,
            psd: password,
            private_key: randomWallet.privateKey

        };
        const result = accountInsertSelective(account);
        return result
            .then((ret) => {
                return responseFun(200, "", {
                    // privateKey: randomWallet.privateKey,
                    address: randomWallet.address,
                });
            })
            .catch((err) => {
                return responseFun(500, err, "");
            });
    }
    // 查询庄户注册状态
    if (req.method === "POST" && req.path === "/api/account/checkAccount") {
        const {address} = req.body;
        //
        try {
            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                throw err
            }

        } catch (e) {
            return responseFun(500, {message: e}, {});
        }
        const result = accountSelectSelective(address);
        return result
            .then((ret) => {
                let isExit;
                if (ret == null) {
                    isExit = false;
                } else {
                    isExit = true;
                }
                return responseFun(200, "", {
                    address: address,
                    isExit,
                });
            })
            .catch((err) => {
                return responseFun(500, err, "");
            });
    }
    // 导出账户 (同步)
    if (req.method === "POST" && req.path === "/api/account/exportAccount") {
        const {address, password} = req.body;
        const result = accountSelectSelective(address);

        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
        return result.then(async (ret) => {
            if (ret == null) {
                return responseFun(500, {message: "账户不存在!"}, {});
                return;
            }
            if (ret.psd != password) {
                throw "invalid password"
            }
            if (ret.private_key) {
                return responseFun(200, "", {
                    address: address,
                    privateKey: ret.private_key,
                });
            } else {
                try {
                    let wallet = await ethers.Wallet.fromEncryptedJson(
                        ret.keystore,
                        password
                    );
                    return responseFun(200, "", {
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                    });
                } catch (err) {
                    return responseFun(500, {message: "invalid password"}, {});
                }
            }

        });
    }
    // 单NFT铸造(异步)
    if (
        req.method === "POST" &&
        req.path === "/api/account/createctNftAsyncIncludeFile"
    ) {
        return new Promise((resolve, reject) => {
            // 创建表单解析对象
            const formsy = formidable({});
            formsy.parse(req, async (err, fields, files) => {
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
                const result = accountSelectSelective(address);

                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                return result
                    .then(async (ret) => {
                        let wallet;
                        if (ret == null) {
                            return responseFun(500, {message: "账户不存在!"}, {});
                            return;
                        }
                        try {
                            wallet = await ethers.Wallet.fromEncryptedJson(
                                ret.keystore,
                                password
                            );
                        } catch (e) {
                            return responseFun(500, {message: "invalid password"}, {});
                        }
                        try {
                            // address: wallet.address,
                            // privateKey: wallet.privateKey,
                            //    单个藏品铸造

                            const tokenId = address + "c1234567890" + Date.now();
                            // 读文件
                            fs.readFile(file.filepath, (err, data) => {
                                if (err) {
                                    return responseFun(500, err, "");
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
                                            return responseFun(500, err, "");
                                        }

                                        // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                                        const resultNft = nftSelectSelectiveCreator(address);

                                        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                                        resultNft
                                            .then(async (retNft) => {
                                                let transCount;

                                                let obj = {};
                                                if (retNft == null) {
                                                    transCount =
                                                        await customHttpProvider.getTransactionCount(
                                                            address
                                                        );
                                                } else {
                                                    transCount = retNft.nonce + 1;
                                                }

                                                //    暂时插入数据库
                                                console.log("insert...", transCount);
                                                let nft = {
                                                    address,
                                                    collectAddress,
                                                    isFinish: 0,
                                                    title,
                                                    status: 0, // 未上架
                                                    description: desc,
                                                    tokenId: tokenId,
                                                    author,
                                                    authorDesc,
                                                    owner: address,
                                                    creator: address,
                                                    serverPath: path.join(
                                                        basePath,
                                                        file.originalFilename
                                                    ),
                                                    fileName: file.originalFilename,
                                                    tempPath: file.filepath,
                                                    tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                                                    nonce: transCount,
                                                };

                                                let result = nftPreInsertSelective(nft);
                                                return result
                                                    .then(async (ret) => {
                                                        //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                                                        // threadProcess(wallet, tokenId);
                                                        // }, 100)
                                                        resolve(
                                                            responseFun(200, "", {
                                                                tokenId,
                                                            })
                                                        );
                                                        return;
                                                    })
                                                    .catch((err) => {
                                                        resolve(responseFun(500, err, {}));
                                                        return;
                                                    });
                                            })
                                            .catch((err) => {
                                                resolve(responseFun(500, err, {}));
                                                return;
                                            });
                                    }
                                );
                            });
                        } catch (err) {
                            resolve(responseFun(500, err, {}));
                            return;
                        }
                    })
                    .catch((err) => {
                        resolve(responseFun(500, err, {}));
                        return;
                    });
            });
        });
    }
    if (
        req.method === "POST" &&
        req.path === "/api/account/createctNftAsyncSplitParam"
    ) {
        return new Promise((resolve, reject) => {
            // 创建表单解析对象
            const {
                address,
                password,
                title,
                collectAddress,
                desc,
                author,
                authorDesc,
                file,
            } = req.body;
            const result = accountSelectSelective(address);

            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            return result
                .then(async (ret) => {
                    console.log(ret);
                    if (ret == null) {
                        resolve(responseFun(500, {message: "账户不存在!"}, {}));
                        return;
                    }
                    let wallet;
                    try {
                        wallet = await ethers.Wallet.fromEncryptedJson(
                            ret.keystore,
                            password
                        );
                    } catch (e) {
                        resolve(responseFun(500, {message: "invalid password"}, {}));
                        return;
                    }
                    try {
                        // address: wallet.address,
                        // privateKey: wallet.privateKey,
                        //    单个藏品铸造
                        const tokenId = address + "c1234567890" + Date.now();
                        // 读文件
                        fetch(file)
                            .then((res) => res.arrayBuffer())
                            .then((data) => {
                                // console.log(data);
                                const basePath = "/public/files/" + Date.now();
                                // 创建目录
                                createDir(basePath);
                                // 写入文件
                                var originalFilename = file.substring(
                                    file.lastIndexOf("/") + 1
                                );
                                console.log(originalFilename);
                                fs.writeFile(
                                    path.join(basePath, originalFilename),
                                    Buffer.from(data),
                                    async (err) => {
                                        if (err) {
                                            return responseFun(500, err, "");
                                        }

                                        // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                                        const resultNft = nftSelectSelectiveCreator(address);

                                        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                                        resultNft
                                            .then(async (retNft) => {
                                                let transCount;
                                                if (retNft == null) {
                                                    transCount =
                                                        await customHttpProvider.getTransactionCount(
                                                            address
                                                        );
                                                } else {
                                                    transCount = retNft.nonce + 1;
                                                }

                                                //    暂时插入数据库
                                                console.log("insert...", transCount);
                                                let nft = {
                                                    address,
                                                    collectAddress,
                                                    isFinish: 0,
                                                    title,
                                                    status: 0, // 未上架
                                                    description: desc,
                                                    tokenId: tokenId,
                                                    author,
                                                    authorDesc,
                                                    owner: address,
                                                    creator: address,
                                                    serverPath: path.join(basePath, originalFilename),
                                                    fileName: originalFilename,
                                                    tempPath: file,
                                                    tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                                                    nonce: transCount,
                                                };

                                                let result = nftPreInsertSelective(nft);
                                                return result
                                                    .then(async (ret) => {
                                                        //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                                                        // threadProcess(wallet, tokenId);
                                                        // }, 100)
                                                        resolve(
                                                            responseFun(200, "", {
                                                                tokenId,
                                                            })
                                                        );
                                                        return;
                                                    })
                                                    .catch((err) => {
                                                        resolve(responseFun(500, err, {}));
                                                        return;
                                                    });
                                            })
                                            .catch((err) => {
                                                resolve(responseFun(500, err, {}));
                                                return;
                                            });
                                    }
                                );
                            });
                    } catch (err) {
                        resolve(responseFun(500, err, {}));
                        return;
                    }
                })
                .catch((err) => {
                    resolve(responseFun(500, err, {}));
                    return;
                });
        });
    }
    if (req.method === "POST" && req.path === "/api/account/createctNftAsyncDivTokenId") {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, tokenId, rebackUrl} = req.body;
        try {
            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                throw err
            }

            let {err1, flag1} = (() => {
                let {err, flag} = validateAddress(collectAddress);
                return {err1: err, flag1: flag}
            })();
            if (!flag1) {
                throw err1
            }

            let {err2, flag2} = (() => {
                let {err, flag} = isJson(data);
                return {err2: err, flag2: flag}
            })();
            if (!flag2) {
                throw err2
            }
            let checkURLRet = checkURL(rebackUrl);
            if (!checkURLRet.flag) {
                throw checkURLRet.err
            }

        } catch (e) {
            return responseFun(500, {message: e}, {});
        }
        //  判断参数是否满足规范
        let ret = await accountSelectSelective(address)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                return responseFun(500, err, {});
            });
        console.log(ret);
        if (ret == null) {
            return responseFun(500, {message: "账户不存在!"}, {});
        }
        let wallet;

        if (ret.private_key) {
            wallet = new ethers.Wallet(ret.private_key, customHttpProvider);
        } else {
            try {
                wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
                wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
                // if (ret.psd != password) {
                //     throw "invalid password"
                // }
            } catch (e) {
                return responseFun(500, {message: "invalid password"}, {});
            }
        }

        try {
            // 查询合约基本信息  type   == 10
            var format = {language: "sql", indent: "  "};
            var params = {address: collectAddress};
            var sql = mybatisMapper.getStatement(
                "collect",
                "selectByAddress",
                params,
                format
            );

            let collectRet = await execSql(sql)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            if (collectRet == null || collectRet.type !== 9) {
                throw {message: "collectAddress is error"};
            }
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            // const tokenId = tokenId;

            // 读文件
            let dataBuffer = await fetch(file)
                .then((res) => res.arrayBuffer())
                .then((dataBuffer) => {
                    return dataBuffer;
                });
            const basePath = "/public/files/" + Date.now();
            // 创建目录
            createDir(basePath);
            // 写入文件
            var originalFilename = file.substring(file.lastIndexOf("/") + 1);
            console.log(originalFilename);
            let {err} = await new Promise((resolve, reject) => {
                fs.writeFile(
                    path.join(basePath, originalFilename),
                    Buffer.from(dataBuffer),
                    (err) => {
                        resolve({err});
                    }
                );
            }).then((ret) => {
                return ret;
            });
            if (err) {
                throw {message: err};
            }

            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            let retNft = await nftSelectSelectiveCreator(address)
                .then((retNft) => {
                    return retNft;
                })
                .catch((err) => {
                    return responseFun(500, err, {});
                });

            let transCount;
            if (retNft == null) {
                transCount = await customHttpProvider.getTransactionCount(
                    address
                );
            } else {
                transCount = retNft.nonce + 1;
            }

            //    暂时插入数据库
            console.log("insert...", transCount);
            let nft = {
                address,
                collectAddress,
                isFinish: 0,
                premetadata: JSON.stringify(data),
                status: 0, // 未上架
                tokenId: tokenId,
                owner: address,
                creator: address,
                serverPath: path.join(basePath, originalFilename),
                fileName: originalFilename,
                tempPath: file,
                tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                nonce: transCount,
                rebackUrl: rebackUrl,
            };

            return await nftPreInsertSelective(nft)
                .then((ret) => {
                    // return ret;
                    return responseFun(200, "", {
                        tokenId,
                    });
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return responseFun(500, err, {});
                });
        } catch (err) {
            return responseFun(500, err, {});
        }
    }
    if (req.method === "POST" && req.path === "/api/account/createctNftAsync") {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, rebackUrl} = req.body;

        try {

            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                throw err
            }

            let {err1, flag1} = (() => {
                let {err, flag} = validateAddress(collectAddress);
                return {err1: err, flag1: flag}
            })();
            if (!flag1) {
                throw err1
            }
            let {err2, flag2} = (() => {
                let {err, flag} = isJson(data);
                return {err2: err, flag2: flag}
            })();
            if (!flag2) {
                throw err2
            }
            let checkURLRet = checkURL(rebackUrl);
            if (!checkURLRet.flag) {
                throw checkURLRet.err
            }

            let checkURLRet1 = checkURL(file);
            if (!checkURLRet1.flag) {
                throw checkURLRet1.err
            }

        } catch (e) {
            return responseFun(500, {message: e}, {});
        }

        //  判断参数是否满足规范
        let ret = await accountSelectSelective(address)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                return responseFun(500, err, {});
            });
        console.log(ret);
        if (ret == null) {
            return responseFun(500, {message: "账户不存在!"}, {});
        }
        let wallet;
        try {
            // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);

            if (ret.psd != password) {
                throw "invalid password";
            }

        } catch (e) {
            return responseFun(500, {message: "invalid password"}, {});
        }
        try {
            // 查询合约基本信息  type   == 10
            var format = {language: "sql", indent: "  "};
            var params = {address: collectAddress};
            var sql = mybatisMapper.getStatement(
                "collect",
                "selectByAddress",
                params,
                format
            );

            let collectRet = await execSql(sql)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            if (collectRet == null || collectRet.type !== 9) {
                throw {message: "collectAddress is error"};
            }
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            const tokenId = address + "c1234567890" + Date.now();
            // 读文件
            let dataBuffer = await fetch(file)
                .then((res) => res.arrayBuffer())
                .then((dataBuffer) => {
                    return dataBuffer;
                });
            const basePath = "/public/files/" + Date.now();
            // 创建目录
            createDir(basePath);
            // 写入文件
            var originalFilename = file.substring(file.lastIndexOf("/") + 1);
            console.log(originalFilename);
            let {err} = await new Promise((resolve, reject) => {
                fs.writeFile(
                    path.join(basePath, originalFilename),
                    Buffer.from(dataBuffer),
                    (err) => {
                        resolve({err});
                    }
                );
            }).then((ret) => {
                return ret;
            });
            if (err) {
                throw {message: err};
            }

            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            let retNft = await nftSelectSelectiveCreator(address)
                .then((retNft) => {
                    return retNft;
                })
                .catch((err) => {
                    return responseFun(500, err, {});
                });

            let transCount;
            if (retNft == null) {
                transCount = await customHttpProvider.getTransactionCount(
                    address
                );
            } else {
                transCount = retNft.nonce + 1;
            }

            //    暂时插入数据库
            console.log("insert...", transCount);
            let nft = {
                address,
                collectAddress,
                isFinish: 0,
                premetadata: JSON.stringify(data),
                status: 0, // 未上架
                tokenId: tokenId,
                owner: address,
                creator: address,
                serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
                fileName: originalFilename,
                tempPath: file,
                tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                nonce: transCount,
                rebackUrl: rebackUrl
            };


            // 插入数据库
            // Get SQL Statement
            var format = {language: "sql", indent: "  "};
            var sql = mybatisMapper.getStatement(
                "nft",
                "insertSelective",
                nft,
                format
            );
            return await execSql(sql)

                .then((ret) => {
                    // return ret;
                    // fileUploadIpfs();
                    return responseFun(200, "", {
                        tokenId,
                    });
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return responseFun(500, err, {});
                });
        } catch (err) {
            return responseFun(500, err, {});
        }
    }
    // 批量铸造
    if (
        req.method === "POST" &&
        req.path === "/api/account/createctNft1155AsyncV1"
    ) {
        // 创建表单解析对象
        const {
            address,
            password,
            collectAddress,
            file,
            supply,
            judge,
            data,
            cMetadata,
        } = req.body;

        try {

            let {err2, flag2} = (() => {
                let {err, flag} = isJson(data);
                return {err2: err, flag2: flag}
            })();
            let {err1, flag1} = (() => {
                let {err, flag} = isJson(cMetadata);
                return {err1: err, flag1: flag}
            })();
            if (!flag1 || !flag2) {
                throw err2
            }

        } catch (e) {
            return responseFun(500, {message: e}, {});
        }
        //  判断参数是否满足规范
        let ret = await accountSelectSelective(address)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                return responseFun(500, err, {});
            });
        // console.log(ret)
        if (ret == null) {
            return responseFun(500, {message: "账户不存在!"}, {});
        }
        let wallet;
        try {
            wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
        } catch (e) {
            return responseFun(500, {message: "invalid password"}, {});
        }
        try {
            // TODO 这里需要先判断余额是否满足
            //查询需要的gas
            wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

            let name, symbol, tokenUrlPrefix, contractUrl;
            name = cMetadata.name;
            symbol = cMetadata.symbol;
            tokenUrlPrefix = cMetadata.tokenUrlPrefix;
            contractUrl = cMetadata.contractUrl;
            let gasCall = await createCollectV1Erc1155Call(
                name,
                symbol,
                tokenUrlPrefix,
                contractUrl,
                wallet
            );
            if (gasCall.err != null) {
                return responseFun(500, {message: gasCall.err}, "");
            } else {
                let neceGas = gasPrice * gasCall.gaslimit;
                // 判断手续费是否足够
                let balance = await wallet.provider.getBalance(address);
                // 余额是 BigNumber (in wei); 格式化为 ether 字符串
                console.log("Balance: ", balance.toString());
                console.log("neceGas: ", neceGas);
                // 这里多赠送手续费
                let neceGas1 = neceGas + supply * 0.2 * 1000000000000000000;
                // 判断是否赠送手续费
                if (neceGas > balance.toString()) {
                    if (judge == true) {
                        //     赠送手续费
                        let walletSys = new ethers.Wallet(
                            privateKeySys,
                            customHttpProvider
                        );
                        let tx = {
                            to: address,
                            // ... or supports ENS names
                            // to: "ricmoo.firefly.eth"
                            // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                            // use this convenience function to convert ether to wei.
                            value: web3.utils.numberToHex(neceGas1),
                        };

                        let txTransfer = await walletSys.sendTransaction(tx);
                        console.log("txTransfer: :", txTransfer.hash);
                        try {
                            let recept1 = await customHttpProvider.waitForTransaction(
                                txTransfer.hash
                            );
                            console.log("recept1:", recept1);
                            if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                                throw {message: "Transaction Reverted"};
                            }
                        } catch (err) {
                            console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
                            return responseFun(500, {message: "Transaction Reverted"}, "");
                        }
                    } else {
                        return responseFun(500, {message: "余额不足"}, "");
                    }
                }
                //    余额足够
                let contractAddress = await createCollectV1Erc1155(
                    name,
                    symbol,
                    tokenUrlPrefix,
                    contractUrl,
                    wallet,
                    gasPrice,
                    gasCall.gaslimit,
                    false
                );
                //  插入收藏夹到数据库
                let collect = {
                    address: contractAddress,
                    name: name,
                    symbol: symbol,
                    owner: wallet.address,
                    contract_url: contractUrl,
                    token_url_prefix: tokenUrlPrefix,
                    contract_name: "CtnftMToken",
                    create_address: wallet.address,
                    type: 1, // v1 1155
                };
                var format = {language: "sql", indent: "  "};
                var sql = mybatisMapper.getStatement(
                    "collect",
                    "insertSelective",
                    collect,
                    format
                );


                let collectRet = await execSql(sql)
                    .then((ret) => {
                        return responseFun(200, "", {
                            ret,
                        });
                    })
                    .catch((err) => {
                        console.log("ERR:", err);
                        return responseFun(500, {message: err.code}, {});
                    });
                if (collectRet.code == 200) {
                    const tokenId = "0x1";
                    // 读文件
                    let dataBuffer = await fetch(file)
                        .then((res) => res.arrayBuffer())
                        .then((dataBuffer) => {
                            return dataBuffer;
                        });
                    const basePath = "/public/files/" + Date.now();
                    // 创建目录
                    createDir(basePath);
                    // 写入文件
                    var originalFilename = file.substring(file.lastIndexOf("/") + 1);
                    console.log(originalFilename);
                    let {err} = await new Promise((resolve, reject) => {
                        fs.writeFile(
                            path.join(basePath, originalFilename),
                            Buffer.from(dataBuffer),
                            (err) => {
                                resolve({err});
                            }
                        );
                    }).then((ret) => {
                        return ret;
                    });
                    if (err) {
                        return responseFun(500, err, "");
                    }

                    // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                    // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                    let retNft = await nftSelectSelectiveCreator(address)
                        .then((retNft) => {
                            return retNft;
                        })
                        .catch((err) => {
                            return responseFun(500, err, {});
                        });

                    let transCount;
                    if (retNft == null) {
                        transCount = await customHttpProvider.getTransactionCount(
                            address
                        );
                    } else {
                        transCount = retNft.nonce + 1;
                    }

                    //    暂时插入数据库
                    console.log("insert...", transCount);
                    let nft = {
                        address,
                        isFinish: 0,
                        premetadata: JSON.stringify(data),
                        status: 0, // 未上架
                        supply,
                        tokenId: tokenId,
                        owner: address,
                        creator: address,
                        serverPath: path.join(basePath, originalFilename),
                        fileName: originalFilename,
                        tempPath: file,
                        tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                        nonce: transCount,
                    };

                    // 插入数据库
                    // Get SQL Statement
                    var format = {language: "sql", indent: "  "};
                    var sql = mybatisMapper.getStatement(
                        "nft",
                        "insertSelective",
                        nft,
                        format
                    );
                    return await execSql(sql)
                        .then((ret) => {
                            return responseFun(200, "", {
                                tokenId,
                                contractAddress,
                            });
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return responseFun(500, {message: err.code}, {});
                        });
                } else {
                    return collectRet;
                }
            }
        } catch (err) {
            return responseFun(500, err, {});
        }
    }
    if (
        req.method === "POST" &&
        req.path === "/api/account/createctNft1155Async"
    ) {
        // 创建表单解析对象
        const {address, password, collectAddress, file, data, supply, rebackUrl} = req.body;
        let {} = req.body;

        try {
            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                throw err
            }

            let {err1, flag1} = (() => {
                let {err, flag} = validateAddress(collectAddress);
                return {err1: err, flag1: flag}
            })();
            if (!flag1) {
                throw err1
            }

            let {err2, flag2} = (() => {
                let {err, flag} = isJson(data);
                return {err2: err, flag2: flag}
            })();
            if (!flag2) {
                throw err2
            }
            let checkURLRet = checkURL(rebackUrl);
            if (!checkURLRet.flag) {
                throw checkURLRet.err
            }

            let checkURLRet1 = checkURL(file);
            if (!checkURLRet1.flag) {
                throw checkURLRet1.err
            }

        } catch (e) {
            return responseFun(500, {message: e}, {});
        }

        if (supply >= 100000) {
            return responseFun(500, {message: "supply must less than 100000"}, {});
        }

        //  判断参数是否满足规范
        let ret = await accountSelectSelective(address)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                return responseFun(500, err, {});
            });
        console.log(ret);
        if (ret == null) {
            return responseFun(500, {message: "账户不存在!"}, {});
        }
        let wallet;
        try {
            // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
            if (ret.psd != password) {
                throw "invalid password"
            }

        } catch (e) {
            return responseFun(500, {message: "invalid password"}, {});
        }
        try {
            // 查询合约基本信息  type   == 10
            var format = {language: "sql", indent: "  "};
            var params = {address: collectAddress};
            var sql = mybatisMapper.getStatement(
                "collect",
                "selectByAddress",
                params,
                format
            );

            let collectRet = await execSql(sql)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            if (collectRet == null || (collectRet.type !== 10 && collectRet.type !== 12)) {
                throw {message: "collectAddress is error"};
            }
            // address: wallet.address,
            // privateKey: wallet.privateKey,
            //    单个藏品铸造
            const tokenId = address + "c1234567890" + Date.now();
            // 读文件
            let dataBuffer = await fetch(file)
                .then((res) => res.arrayBuffer())
                .then((dataBuffer) => {
                    return dataBuffer;
                });
            const basePath = "/public/files/" + Date.now();
            // 创建目录
            createDir(basePath);
            // 写入文件
            var originalFilename = file.substring(file.lastIndexOf("/") + 1);
            console.log(originalFilename);
            let {err} = await new Promise((resolve, reject) => {
                fs.writeFile(
                    path.join(basePath, originalFilename),
                    Buffer.from(dataBuffer),
                    (err) => {
                        resolve({err});
                    }
                );
            }).then((ret) => {
                return ret;
            });
            if (err) {
                return responseFun(500, err, "");
            }

            // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
            // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
            let retNft = await nftSelectSelectiveCreator(address)
                .then((retNft) => {
                    return retNft;
                })
                .catch((err) => {
                    return responseFun(500, err, {});
                });

            let transCount;
            if (retNft == null) {
                transCount = await customHttpProvider.getTransactionCount(
                    address
                );
            } else {
                transCount = retNft.nonce + 1;
            }

            //    暂时插入数据库
            console.log("insert...", transCount);
            let nft = {
                address,
                isFinish: 0,
                premetadata: JSON.stringify(data),
                status: 0, // 未上架
                supply,
                collectAddress,
                tokenId: tokenId,
                owner: address,
                creator: address,
                serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
                fileName: originalFilename,
                tempPath: file,
                tokenIdDecmial: web3.utils.hexToNumberString(tokenId),
                nonce: transCount,
                rebackUrl: rebackUrl
            };

            // 插入数据库
            // Get SQL Statement
            var format = {language: "sql", indent: "  "};
            var sql = mybatisMapper.getStatement(
                "nft",
                "insertSelective",
                nft,
                format
            );
            return await execSql(sql)
                .then((ret) => {
                    // fileUploadIpfs();
                    return responseFun(200, "", {
                        tokenId,
                    });
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return responseFun(500, {message: err.code}, {});
                });
        } catch (err) {
            return responseFun(500, err, {});
        }
    }
    //创建收藏夹
    if (req.method === "POST" && req.path === "/api/account/createctCollect") {

        // 创建表单解析对象
        try {
            const {address, password, cMetadata, type} = req.body;

            try {
                let {err, flag} = validateAddress(address);
                if (!flag) {
                    throw err
                }
                let {err2, flag2} = (() => {
                    let {err, flag} = isJson(cMetadata);
                    return {err2: err, flag2: flag}
                })();
                if (!flag2) {
                    throw err2
                }

            } catch (e) {
                return responseFun(500, {message: e}, {});
            }
            if (JSON.stringify(cMetadata).indexOf("{") == -1) {
                return responseFun(500, {message: "invalid paramter data"}, {});
            }

            //  判断参数是否满足规范
            let ret = await accountSelectSelective(address)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    return responseFun(500, err, {});
                });
            if (ret == null) {
                return responseFun(500, {message: "账户不存在!"}, {});
            }
            let wallet;
            if (ret.psd != password) {
                throw {message: "invalid password"}
            }
            if (!cMetadata.tokenUrlPrefix) {
                throw {message: "invalid tokenUrlPrefix"};
            }
            if (!cMetadata.tokenUrlPrefix.endsWith("/")) {
                throw {message: "invalid tokenUrlPrefix endsWith /"};
            }
            if (ret.private_key) {
                wallet = new ethers.Wallet(ret.private_key, customHttpProvider);
            } else {
                try {
                    wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
                    wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
                    // if (ret.psd != password) {
                    //     throw "invalid password"
                    // }
                } catch (e) {
                    return responseFun(500, {message: "invalid password"}, {});
                }
            }

            // 创建收藏夹
            //    查询创建合约的手续费
            let {err, gaslimit} = await createCollectV2Call(type, wallet);

            let initResult = await collectInitCall(cMetadata.name,
                cMetadata.symbol,
                cMetadata.tokenUrlPrefix,
                cMetadata.contractUrl,
                type,
                collectAddressExample,
                wallet);
            let errInit, gaslimitInit;
            errInit = initResult.err;
            gaslimitInit = initResult.gaslimit;
            if (err != null) {
                console.log("createCollectV2Call faild");
                return responseFun(500, {message: err}, {});
            }
            if (errInit != null) {
                console.log("createCollectV2Call faild");
                return responseFun(500, {message: errInit}, {});
            }
            //    赠送合约手续费
            let neceliby = ethers.utils.formatEther((gasPrice * gaslimit).toString());
            let necelibyInit = ethers.utils.formatEther((gasPrice * gaslimitInit).toString());
            console.log("neceliby*:", neceliby);
            console.log("necelibyInit*:", necelibyInit);
            let necelibyTotal = Number(neceliby) + Number(necelibyInit)
            let balance = await wallet.provider.getBalance(address);
            // 余额是 BigNumber (in wei); 格式化为 ether 字符串
            let etherString = ethers.utils.formatEther(balance);
            console.log("Balance: ", etherString);
            // 计算初始化合约费用
            console.log("余额是否充足:", Number(balance) < Number(necelibyTotal))
            if (Number(etherString) < Number(necelibyTotal)) {
                // if (true) {
                //     let {err, hash} = await transfer(neceliby.toString(), address);
                //     if (err != null) {
                //         console.log("txTransfer faild");
                //         return responseFun(500, {message: err}, {});
                //     }
                //     console.log("tx Hash:", hash);
                return responseFun(500, {message: "账户余额不足!"}, {});
            }
            let nonce =
                await customHttpProvider.getTransactionCount(address, "latest");
            //    创建合约
            let collectAddress = await createCollectV2(
                wallet,
                gasPrice,
                gaslimit,
                type,
                false
            );
            // if (collectAddress == null) {
            //     return responseFun(500, {message: "创建合约失败"}, {});
            // }
            // 这里前面已经可以算出合约地址, 这里为了方便,直接计算得出, 不使用返回值.
            collectAddress = "0x" + util.generateAddress(Buffer.from(stripHexPrefix(wallet.address), "hex"), nonce).toString("hex");
            //    初始化{err, hash}
            let result1 = await collectInit(
                cMetadata.name,
                cMetadata.symbol,
                cMetadata.tokenUrlPrefix,
                cMetadata.contractUrl,
                type,
                collectAddress,
                wallet,
                gaslimitInit
            );
            if (result1.err != null) {
                console.log("txTransfer faild");
                return responseFun(500, {message: result1.err}, {});
            }
            let contractName;
            if (type == 10) {
                contractName = ERC721Ctnft.contractName;
            } else if (type == 12) {
                contractName = ERC1155CtnftOwner.contractName;
            } else if (type == 9) {
                contractName = ERC1155Ctnft.contractName;
            } else if (type == 1) {
                contractName = CtnftMToken.contractName;
            } else {
                contractName = "";
            }
            //  插入收藏夹到数据库
            let collect = {
                address: collectAddress,
                name: cMetadata.name,
                symbol: cMetadata.symbol,
                owner: wallet.address,
                contract_url: cMetadata.contractUrl,
                token_url_prefix: cMetadata.tokenUrlPrefix,
                contract_name: contractName,
                create_address: wallet.address,
                type: type, // v1 1155
            };
            var format = {language: "sql", indent: "  "};
            var sql = mybatisMapper.getStatement(
                "collect",
                "insertSelective",
                collect,
                format
            );

            return await execSql(sql)
                .then((ret) => {
                    return responseFun(200, "", {
                        collectAddress,
                        type,
                        hash: result1.hash,
                    });
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return responseFun(500, {message: err.code}, {});
                });
        } catch (err) {
            return responseFun(500, err, {});
        }
    }
    // 单NFT铸造(同步)
    if (req.method === "POST" && req.path === "/api/account/createctNft") {
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
                const result = accountSelectSelective(address);

                // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                return result.then(async (ret) => {
                    if (ret == null) {
                        return responseFun(500, {message: "账户不存在!"}, {});
                        return;
                    }
                    try {
                        let wallet = await ethers.Wallet.fromEncryptedJson(
                            ret.keystore,
                            password
                        );
                    } catch (err) {
                        resolve(responseFun(500, {message: "invalid password"}, {}));
                        return;
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
                                        "https://dream.chaonft.cn/ipfs/api/v0/cat/" + imgIpfsAddress;
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
                                                    ERC721Ctnft.abi,
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
                                                    metaDataSource: JSON.stringify(data),
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
                                                        console.log("inset NFT data:", ret);
                                                        resolve(responseFun(200, "", {hash: tx.hash}));
                                                        return;
                                                    })
                                                    .catch((err) => {
                                                        resolve(responseFun(500, err, ""));
                                                        return;
                                                    });
                                            } catch (e) {
                                                resolve(responseFun(500, e.message, ""));
                                                return;
                                            }
                                        })
                                        .catch((err) => {
                                            resolve(responseFun(500, err, {}));
                                            return;
                                        });
                                })
                                .catch((err) => {
                                    resolve(responseFun(500, err, {}));
                                    return;
                                });
                        });
                    } catch (err) {
                        resolve(responseFun(500, err, {}));
                        return;
                    }
                });
            });
        });
    }
    // 查询和批量查询
    if (req.method === "POST" && req.path === "/api/account/queryNft") {
        const {tokenIds} = req.body;
        const result = nftSelectSelective(tokenIds);
        return result
            .then((ret) => {
                return responseFun(200, "", ret);
            })
            .catch((err) => {
                return responseFun(500, err, "");
            });
    }
    // 回调  TODO 这个可能需要考虑是否需要回调
    if (req.method === "POST" && req.path === "/api/account/callFun") {
        const {tokenId, status, key} = req.body;
        console.log("callFun:", tokenId, status, key);
        return {code: 0};
    }
    // 积分相关接口
    if (req.method === "POST" && req.path === "/api/account/rcti") {
        const {address, password, type, amount} = req.body;
        // 2 注册积分    1  消费积分
        console.log({address, password, type, amount})
        try {
            try {

                //  判断参数是否满足规范
                let ret = await accountSelectSelective(address)
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        return responseFun(500, err, {});
                    });
                console.log(ret);
                if (ret == null) {
                    return responseFun(500, {message: "账户不存在!"}, {});
                }
                let wallet = await ethers.Wallet.fromEncryptedJson(
                    ret.keystore,
                    password
                );
            } catch (err) {
                throw {message: "invalid password"}
            }
            var format = {language: "sql", indent: "  "};
            var params = {type: 11};  // 草田积分合约
            var sql = mybatisMapper.getStatement(
                "collect",
                "selectByType",
                params,
                format
            );
            let collectRet = await execSql(sql)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            if (collectRet == null) {
                throw {message: "collectAddress is error"};
            }
            let contractAddress = collectRet.address;
            let tamount;
            if (amount == undefined) {
                tamount = 1;
            } else {
                tamount = amount;
            }
            let {err, hash} = await sendCTI(contractAddress, address, type, tamount);
            if (err != null) {
                throw err;
            }
            return responseFun(200, null, {hash: hash, type: type})
        } catch (err) {
            return responseFun(500, err, null)
        }
    }
    // 通过个人身份转账接口
    if (req.method === "POST" && req.path === "/api/account/transfer_f") {
        const {address, password, amount, to, tokenId, rebackUrl, orderId} = req.body;

        console.log({address, password, amount, to, tokenId});
        let collectAddress;
        try {


            let wallet;
            //  判断参数是否满足规范
            let {err, flag} = validateAddress(address);
            if (!flag) {
                throw {message: err}
            }

            let {err1, flag1} = (() => {
                let {err, flag} = validateAddress(to);
                return {err1: err, flag1: flag}
            })();
            if (!flag1) {
                throw {message: err1}
            }
            // if (address.toLowerCase() == to.toLowerCase()) {
            //     throw {message: "transfer is owner!"}
            // }

            let ret = await accountSelectSelective(address)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    return responseFun(500, err, {});
                });
            console.log(ret);
            if (ret == null) {
                return responseFun(500, {message: "账户不存在!"}, {});
            }

            if (password != ret.psd) {
                throw {message: "invalid password"};
            }

            let checkURLRet = checkURL(rebackUrl);
            if (!checkURLRet.flag) {
                throw checkURLRet.err
            }

            try {

                //
                // wallet = await ethers.Wallet.fromEncryptedJson(
                //     ret.keystore,
                //     password
                // );
            } catch (err) {
                throw {message: "invalid password"}
            }


            //这里直接查询合约地址

            var params = {tokenId: tokenId};
            var sqlQueryByTokenId = mybatisMapper.getStatement(
                "nft",
                "selectByTokenId",
                params,
                format
            );
            console.log(sqlQueryByTokenId)
            let nftObj = await execSql(sqlQueryByTokenId)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            console.log("nftObj:", nftObj)
            if (nftObj == null) {
                throw {message: "nft is not exist!"};
            }

            let supply = nftObj['supply'];
            collectAddress = nftObj['collectAddress'];
            var format = {language: "sql", indent: "  "};
            var params = {address: nftObj['collectAddress']};  // 草田积分合约
            var sql = mybatisMapper.getStatement(
                "collect",
                "selectByAddress",
                params,
                format
            );
            let collectDetail = await execSql(sql)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("ERR:", err);
                    return err;
                });
            if (collectDetail == null) {
                throw {message: "collectAddress is error"};
            }
            // 判断合约转账类型
            let contract;
            let transObjFrom;
            let transObjTo;
            let juAmount = 0;
            switch (collectDetail['type']) {

                case 10:
                case 12:
                    contract = new ethers.Contract(
                        collectAddress,
                        ERC1155Ctnft.abi,   // 10 和 12 是同一个abi
                        customHttpProvider
                    );
                    //    查询协议tokenId的总发行

                    //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
                    //     链上判断, 这个是一个模糊判断
                    // wallet = new ethers.Wallet(
                    //     wallet.privateKey,
                    //     customHttpProvider
                    // );
                    // let contractWithSigner = contract.connect(wallet);


                    // 链上余额判断
                    // let accountBalance = await contractWithSigner.balanceOf(
                    //     address,
                    //     tokenId
                    // );
                    // if (accountBalance < amount) {
                    //     throw {message: "chain balance is enough!"}
                    // }

                    // 数据库余额判断
                    //    数据库已有数据判断
                    transObjFrom = await execSql(mybatisMapper.getStatement(
                        "trans_form_list",
                        "selectByFormAndTokenId",
                        {token_id: tokenId, t_from: address},
                        format
                    ))
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });
                    transObjTo = await execSql(mybatisMapper.getStatement(
                        "trans_form_list",
                        "selectByToAndTokenId",
                        {token_id: tokenId, t_to: address},
                        format
                    ))
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });

                    juAmount = 0;
                    if (transObjFrom && transObjFrom['sumAmount']) {
                        juAmount -= Number(transObjFrom['sumAmount']);
                    }

                    if (transObjTo && transObjTo['sumAmount']) {
                        juAmount += Number(transObjTo['sumAmount']);
                    }
                    console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
                        transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
                        nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());

                    //这里对余额进行判断
                    //判断是否是发行方,然后根据发行量进行判断
                    if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                        // if (supply > 0) {   // 这里再判断一次, 按理12是都是大于0的
                        if (Number(supply) - Number(juAmount) <= 0) {
                            throw {message: "db balance is enough!"}
                        }
                        // }

                    } else {
                        // 根据数据库的转账数量来判断
                        // 不是发行方,根据数据库转入转出记录判断
                        if (Number(juAmount) <= 0) {
                            throw {message: "db balance is enough!"}
                        }

                    }

                    // save db
                    let trans_form_list_item = {
                        t_from: address,
                        t_to: to,
                        collectAddress: collectAddress,
                        amount: amount,
                        reback_url: rebackUrl,
                        token_id: tokenId,
                        orderId: orderId,
                        type: collectDetail['type'],
                        t_status: 1,
                    };

                    //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
                    var sqlQueryByTokenIdAndForm = mybatisMapper.getStatement(
                        "trans_form_list",
                        "insertSelective",
                        trans_form_list_item,
                        format
                    );
                    return await execSql(sqlQueryByTokenIdAndForm)
                        .then((ret) => {
                            console.log("inset TransFotmList data:", ret);
                            // betchTransfer();
                            return responseFun(200, "", {ret: ret});

                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return responseFun(500, err, "");
                        });
                    break;
                case 9:
                    contract = new ethers.Contract(
                        collectAddress,
                        ERC721Ctnft.abi,   // 10 和 12 是同一个abi
                        customHttpProvider
                    );
                    //    查询协议tokenId的总发行
                    supply = 1;

                    //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
                    //     链上判断, 这个是一个模糊判断
                    // wallet = new ethers.Wallet(
                    //     wallet.privateKey,
                    //     customHttpProvider
                    // );
                    // contractWithSigner = contract.connect(wallet);
                    //
                    //
                    // // 链上余额判断
                    // let accountAddress = await contractWithSigner.ownerOf(
                    //     tokenId
                    // );
                    // if (accountAddress != wallet.address) {
                    //     throw {message: "chain balance is enough!"}
                    // }

                    // 数据库余额判断
                    //    数据库已有数据判断
                    transObjFrom = await execSql(mybatisMapper.getStatement(
                        "trans_form_list",
                        "selectByFormAndTokenId",
                        {token_id: tokenId, t_from: address},
                        format
                    ))
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });
                    transObjTo = await execSql(mybatisMapper.getStatement(
                        "trans_form_list",
                        "selectByToAndTokenId",
                        {token_id: tokenId, t_to: address},
                        format
                    ))
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });

                    juAmount = 0;
                    if (transObjFrom && transObjFrom['sumAmount']) {
                        juAmount -= Number(transObjFrom['sumAmount']);
                    }

                    if (transObjTo && transObjTo['sumAmount']) {
                        juAmount += Number(transObjTo['sumAmount']);
                    }

                    console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
                        transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
                        nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());
                    //这里对余额进行判断
                    //判断是否是发行方,然后根据发行量进行判断
                    if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
                        // if (!supply > 0) {   // 这里再判断一次, 按理9是都是为空的
                        if (supply - juAmount <= 0) {
                            throw {message: "db balance is enough!"}
                        }
                        // }

                    } else {
                        // 根据数据库的转账数量来判断
                        // 不是发行方,根据数据库转入转出记录判断
                        if (Number(juAmount) <= 0) {
                            throw {message: "db balance is enough!"}
                        }

                    }

                    // save db

                    //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
                    var sqlQueryByTokenIdAndForm1 = mybatisMapper.getStatement(
                        "trans_form_list",
                        "insertSelective",
                        {
                            t_from: address,
                            t_to: to,
                            collectAddress: collectAddress,
                            amount: amount,
                            reback_url: rebackUrl,
                            token_id: tokenId,
                            orderId: orderId,
                            type: collectDetail['type'],
                            t_status: 1,
                        },
                        format
                    );
                    return await execSql(sqlQueryByTokenIdAndForm1)
                        .then((ret) => {
                            console.log("inset TransFotmList data:", ret);
                            return responseFun(200, "", {ret: ret});

                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return responseFun(500, err, "");
                        });
                    break;
                default:
                    return responseFun(500, {message: "暂不受支持的合约!"}, null)
            }

        } catch (err) {
            return responseFun(500, err, null)
        }
    }
    // 转fee
    if (req.method === "POST" && req.path === "/api/account/tfee") {
        const {address, password} = req.body;

        // try {
        //     if (password != "^*(&%^&hkjhhkjhGKJH^&^gjh") {
        //         return responseFun(500, err, null)
        //     } else {
        //         transfer("20000000000000000000", address);
        //     }
        //     return responseFun(200, null, {hash: null})
        // } catch (err) {
        //     return responseFun(500, err, null)
        // }
    }
};

function callback(progress) {
    console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

async function transfer(value, toAddress) {
    let walletSys = new ethers.Wallet(
        privateKeySys,
        customHttpProvider
    );
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.numberToHex(value),
        // nonce: transactionCount1Mint,
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

module.exports = handleUserRouter;
