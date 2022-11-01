const ethers = require("ethers");
const fetch = require("node-fetch");
const formidable = require("formidable");
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ERC1155CtnftOwner = require("../contract/ERC1155CtnftOwner.json");
const CtnftMToken = require("../contract/CtnftMToken.json");
const JiFenToken = require("../contract/JiFenToken.json");

const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeyJifen = GlobalConfig.SCORE_ACCOUNT.private_key; // mint pri

// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(  {
        ...rpc
    }, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const Web3 = require("web3");
let web3 = new Web3(
    new Web3.providers.HttpProvider(rpc.url, {
        headers: rpc.headers
    })
);

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};

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

// 创建收藏夹 ERC721 支持懒铸造
async function createCollectV2Erc721(req, res) {
}

// 创建收藏夹 ERC1155 支持懒铸造
async function createCollectV2(wallet, gasPrice, gasLimit, type, wait) {
    let overrides = {
        // The maximum units of gas for the transaction to use
        gasLimit: web3.utils.numberToHex(gasLimit),
        // The price (in wei) per unit of gas
        gasPrice: web3.utils.numberToHex(gasPrice),
    };
    // 常见合约工厂实例
    let factory;
    if (type == 10) {
        factory = new ethers.ContractFactory(
            ERC1155Ctnft.abi,
            ERC1155Ctnft.bytecode,
            wallet
        );
    } else if (type == 12) {
        factory = new ethers.ContractFactory(
            ERC1155CtnftOwner.abi,
            ERC1155CtnftOwner.bytecode,
            wallet
        );
    } else if (type == 9) {
        factory = new ethers.ContractFactory(
            ERC721Ctnft.abi,
            ERC721Ctnft.bytecode,
            wallet
        );
    } else {
        return null;
    }
    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let contract = await factory.deploy(overrides);
    // 部署交易有一旦挖出，合约地址就可用
    // 参考: https://ropsten.etherscan.io/address/0x2bd9aaa2953f988153c8629926d22a6a5f69b14e
    console.log(contract.address);
    // "0x2bD9aAa2953F988153c8629926D22A6a5F69b14E"
    // 发送到网络用来部署合约的交易
    // 查看: https://ropsten.etherscan.io/tx/0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51
    console.log(contract.deployTransaction.hash);
    // "0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51"
    //合约还没有部署;我们必须等到它被挖出
    if (wait == true) {
        let recept = await contract.deployed();
    }
    // 好了 合约已部署。
    return contract.address;
}

async function createCollectV1Erc1155(
    name,
    symbol,
    tokenUrlPrefix,
    contractUrl,
    wallet,
    gasPrice,
    gasLimit,
    wait
) {
    let overrides = {
        // The maximum units of gas for the transaction to use
        gasLimit: web3.utils.numberToHex(gasLimit),
        // The price (in wei) per unit of gas
        gasPrice: web3.utils.numberToHex(gasPrice),
    };
    // 常见合约工厂实例
    let factory = new ethers.ContractFactory(
        CtnftMToken.abi,
        CtnftMToken.bytecode,
        wallet
    );
    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let contract = await factory.deploy(
        name,
        symbol,
        tokenUrlPrefix,
        contractUrl,
        overrides
    );
    // 部署交易有一旦挖出，合约地址就可用
    // 参考: https://ropsten.etherscan.io/address/0x2bd9aaa2953f988153c8629926d22a6a5f69b14e
    console.log(contract.address);
    // "0x2bD9aAa2953F988153c8629926D22A6a5F69b14E"
    // 发送到网络用来部署合约的交易
    // 查看: https://ropsten.etherscan.io/tx/0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51
    console.log(contract.deployTransaction.hash);
    // "0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51"
    //合约还没有部署;我们必须等到它被挖出
    if (wait == true) {
        let recept = await contract.deployed();
    }
    // 好了 合约已部署。
    return contract.address;
}

async function createCollectV1Erc1155Call(
    name,
    symbol,
    tokenUrlPrefix,
    contractUrl,
    wallet
) {
    // 常见合约工厂实例
    let factory = new ethers.ContractFactory(
        CtnftMToken.abi,
        CtnftMToken.bytecode,
        wallet
    );
    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let data = await factory.getDeployTransaction(
        name,
        symbol,
        tokenUrlPrefix,
        contractUrl
    );
    let {err, gaslimit} = await new Promise((resolve, reject) => {
        web3.eth.estimateGas(
            {
                data: data.data,
                value: 0,
                from: wallet.address,
            },
            (err, gaslimit) => {
                console.log("err\n:" + err);
                console.log("gas:\n" + gaslimit);
                resolve({err, gaslimit});
            }
        );
    }).then((ret) => {
        return ret;
    });
    console.log({err, gaslimit});
    return {err, gaslimit};
}

async function createCollectV2Call(type, wallet) {
    // 常见合约工厂实例
    let factory;
    if (type == 10) {
        //  1155
        factory = new ethers.ContractFactory(
            ERC1155Ctnft.abi,
            ERC1155Ctnft.bytecode,
            wallet
        );
    } else if (type == 9) {
        //  721
        factory = new ethers.ContractFactory(
            ERC721Ctnft.abi,
            ERC721Ctnft.bytecode,
            wallet
        );
    } else if (type == 12) {
        //  721
        factory = new ethers.ContractFactory(
            ERC1155CtnftOwner.abi,
            ERC1155CtnftOwner.bytecode,
            wallet
        );
    } else {
        return {err: "没有找到匹配的合约信息", gaslimit: 0};
    }

    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let data = await factory.getDeployTransaction();
    let {err, gaslimit} = await new Promise((resolve, reject) => {
        web3.eth.estimateGas(
            {
                data: data.data,
                value: 0,
                from: wallet.address,
            },
            (err, gaslimit) => {
                // console.log("err\n:" + err);
                // console.log("gas:\n" + gaslimit);
                resolve({err, gaslimit});
            }
        );
    }).then((ret) => {
        return ret;
    });
    return {err, gaslimit};
}

async function collectInit(
    name,
    symbol,
    tokenUrlPrefix,
    contractUrl,
    type,
    collectAddress,
    wallet,
    gaslimitInit
) {
    if (type == 10) {
        try {
            let contract = new ethers.Contract(
                collectAddress,
                ERC1155Ctnft.abi,
                customHttpProvider
            );
            let contractWithSigner = contract.connect(wallet);
            let tx = await contractWithSigner
                .__ERC1155Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {gasLimit: gaslimitInit})
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                    return err;
                });
            let recept = await customHttpProvider
                .waitForTransaction(tx.hash)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                });
            // console.log(recept);
            if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                throw {message: "Transaction Reverted"};
            }

            return {err: null, hash: tx.hash};
        } catch (err) {
            return {err: err, hash: null};
        }
    } else if (type == 12) {
        try {
            let contract = new ethers.Contract(
                collectAddress,
                ERC1155CtnftOwner.abi,
                customHttpProvider
            );
            let contractWithSigner = contract.connect(wallet);
            let tx = await contractWithSigner
                .__ERC1155Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {gasLimit: gaslimitInit})
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                    return err;
                });
            let recept = await customHttpProvider
                .waitForTransaction(tx.hash)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                });
            // console.log(recept);
            if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                throw {message: "Transaction Reverted"};
            }

            return {err: null, hash: tx.hash};
        } catch (err) {
            return {err: err, hash: null};
        }
    } else if (type == 9) {
        // 721
        try {
            let contract = new ethers.Contract(
                collectAddress,
                ERC721Ctnft.abi,
                customHttpProvider
            );
            let contractWithSigner = contract.connect(wallet);
            let tx = await contractWithSigner
                .__ERC721Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {gasLimit: gaslimitInit})
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                    return err;
                });
            let recept = await customHttpProvider
                .waitForTransaction(tx.hash)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.log("err:", err);
                });
            console.log(recept);
            if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                throw {message: "Transaction Reverted"};
            }

            return {err: null, hash: tx.hash};
        } catch (err) {
            return {err: err, hash: null};
        }
    } else {
        return {err: "未实现的合约类型", hash: null};
    }
}

async function collectInitCall(
    name,
    symbol,
    tokenUrlPrefix,
    contractUrl,
    type,
    collectAddressMap,
    wallet,
) {
    if (type == 10) {
        let contract = new ethers.Contract(
            collectAddressMap['10'],
            ERC1155Ctnft.abi,
            customHttpProvider
        );
        let {err, gaslimit} = await contract.estimateGas
            .__ERC1155Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {from: "0x269153639cd53a0e41841801a149824c320f1d29"})
            .then((ret) => {
                return {err: null, gaslimit: ret};
            })
            .catch((err) => {
                // console.log("err:", err);
                return {err: err, gaslimit: null};
            });
        return {err, gaslimit};
    } else if (type == 12) {
        let contract = new ethers.Contract(
            collectAddressMap['12'],
            ERC1155CtnftOwner.abi,
            customHttpProvider
        );
        let {err, gaslimit} = await contract.estimateGas
            .__ERC1155Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {from: "0x269153639cd53a0e41841801a149824c320f1d29"})
            .then((ret) => {
                return {err: null, gaslimit: ret};
            })
            .catch((err) => {
                console.log("err:", err);
                return {err: err, gaslimit: null};
            });
        return {err, gaslimit};
    } else if (type == 9) {
        // 721
        let contract = new ethers.Contract(
            collectAddressMap['9'],
            ERC721Ctnft.abi,
            customHttpProvider
        );
        let {err, gaslimit} = await contract.estimateGas
            .__ERC721Ctnft_init(name, symbol, tokenUrlPrefix, contractUrl, {from: "0x269153639cd53a0e41841801a149824c320f1d29"})
            .then((ret) => {
                return {err: null, gaslimit: ret};
            })
            .catch((err) => {
                console.log("err:", err);
                return {err: err, gaslimit: null};
            });
        return {err, gaslimit};
    } else {
        return {err: "未实现的合约类型", gaslimit: null};
    }
}

async function sendCTI(collectAddress, toAddress, type, amount) {
    let walletSys = new ethers.Wallet(privateKeyJifen, customHttpProvider);
    try {
        let contract = new ethers.Contract(
            collectAddress,
            JiFenToken.abi,
            customHttpProvider
        );
        let contractWithSigner = contract.connect(walletSys);
        let tx = await contractWithSigner
            .mint(type, amount, toAddress)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("err:", err);
                return err;
            });
        let recept = await customHttpProvider
            .waitForTransaction(tx.hash)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("err:", err);
            });
        console.log(recept);
        if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            throw {message: "Transaction Reverted"};
        }

        return {err: null, hash: tx.hash};
    } catch (err) {
        return {err: err, hash: null};
    }
}

module.exports = {
    createCollectV1Erc1155,
    createCollectV1Erc1155Call,
    createCollectV2,
    createCollectV2Call,
    collectInit,
    collectInitCall,
    sendCTI,
};
