"use strict";
const ethers = require("ethers");
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const ERC1155CtnftOwner = require("../contract/ERC1155CtnftOwner.json");
const JiFenToken = require("../contract/JiFenToken.json");
const Web3 = require("web3");
const pino = require("pino");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
const GlobalConfig = require("../config/GlobalConfig.json");
const {TRANSACTION_RECEIPT_STATUS} = require("../task/taskConst");
const {web3} = require("../task/taskConst");
let privateKeyJifen = GlobalConfig.SCORE_ACCOUNT.private_key; // mint pri

const {customHttpProvider} = require("../task/taskConst");
const {validate} = require("./fcommon");

const contractMap = {
    9: ERC721Ctnft, 10: ERC1155Ctnft, 12: ERC1155CtnftOwner
};

const contractInitMap = {
    9: "__ERC721Ctnft_init", 10: "__ERC1155Ctnft_init", 12: "__ERC1155Ctnft_init"
};

// 创建收藏夹 ERC1155 支持懒铸造
async function createCollectV2(wallet, gasPrice, gasLimit, type, wait) {
    let overrides = {
        // The maximum units of gas for the transaction to use
        // gasLimit: Web3.utils.numberToHex(gasLimit),
        // The price (in wei) per unit of gas
        maxFeePerGas: Web3.utils.numberToHex(4800e9), maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
    };

    const contractData = contractMap[type];

    // 常见合约工厂实例
    let factory;
    if (contractData) {
        factory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, wallet);
    } else {
        return null;
    }

    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let contract = await factory.deploy(overrides);
    // 部署交易有一旦挖出，合约地址就可用
    // 参考: https://ropsten.etherscan.io/address/0x2bd9aaa2953f988153c8629926d22a6a5f69b14e
    logger.debug(contract.address);
    // "0x2bD9aAa2953F988153c8629926D22A6a5F69b14E"
    // 发送到网络用来部署合约的交易
    // 查看: https://ropsten.etherscan.io/tx/0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51
    logger.debug(contract.deployTransaction.hash);
    // "0x159b76843662a15bd67e482dcfbee55e8e44efad26c5a614245e12a00d4b1a51"
    //合约还没有部署;我们必须等到它被挖出
    if (wait == true) {
        let recept = await contract.deployed();
    }
    // 好了 合约已部署。
    return contract.address;
}

async function createCollectV2Call(type, wallet) {

    const contractData = contractMap[type];

    // 常见合约工厂实例
    let factory;
    if (contractData) {
        factory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, wallet);
    } else {
        return {err: "没有找到匹配的合约信息", gaslimit: 0};
    }

    // 请注意，我们将 "Hello World" 作为参数传递给合约构造函数constructor
    let data = await factory.getDeployTransaction();
    let {err, gaslimit} = await new Promise((resolve, reject) => {
        web3.eth.estimateGas({
            data: data.data, value: 0, from: wallet.address,
        }, (err, gaslimit) => {
            // logger.debug("err\n:" + err);
            // logger.debug("gas:\n" + gaslimit);
            resolve({err, gaslimit});
        });
    }).then((ret) => {
        return ret;
    });
    return {err, gaslimit};
}

async function collectInit(name, symbol, tokenUrlPrefix, contractUrl, type, collectAddress, wallet, gaslimitInit) {

    const contractData = contractMap[type];
    let contract = new ethers.Contract(collectAddress, contractData.abi, customHttpProvider);

    const contractInitData = contractInitMap[type];

    let contractWithSigner = contract.connect(wallet);
    if (contractData) {
        try {
            let tx = await contractWithSigner
                [contractInitData](name, symbol, tokenUrlPrefix, contractUrl, {
                // gasLimit: gaslimitInit,
                maxFeePerGas: Web3.utils.numberToHex(4800e9),
                maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
            })
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.trace(error)
                    logger.debug("err:%s", err);
                    return err;
                });

            let recept = await customHttpProvider
                .waitForTransaction(tx.hash)
                .then((ret) => {
                    return ret;
                })
                .catch((err) => {
                    console.trace(error)
                    logger.debug("err:%s", err);
                });
            // logger.debug(recept);
            validate(recept.status === TRANSACTION_RECEIPT_STATUS.SUCCESS, 'Transaction Reverted');
            return {err: null, hash: tx.hash};
        } catch (err) {
            console.trace(err)
            return {err: err, hash: null};
        }
    } else {
        return {err: "未实现的合约类型", hash: null};
    }

}

async function collectInitCall(name, symbol, tokenUrlPrefix, contractUrl, type, collectAddressMap, wallet,) {

    const contractData = contractMap[type];
    let contract = new ethers.Contract(collectAddressMap[String(type)], contractData.abi, customHttpProvider);

    const contractInitData = contractInitMap[type];
    if (contractData) {

    } else {
        return {err: "未实现的合约类型", gaslimit: null};
    }

    let {err, gaslimit} = await contract.estimateGas
        [contractInitData](name, symbol, tokenUrlPrefix, contractUrl, {from: "0x269153639cd53a0e41841801a149824c320f1d29"})
        .then((ret) => {
            return {err: null, gaslimit: ret};
        })
        .catch((err) => {
            console.trace(err)
            logger.debug("err:%s", err);
            return {err: err, gaslimit: null};
        });
    return {err, gaslimit};

}

async function sendCTI(collectAddress, toAddress, type, amount) {
    let walletSys = new ethers.Wallet(privateKeyJifen, customHttpProvider);
    try {
        let contract = new ethers.Contract(collectAddress, JiFenToken.abi, customHttpProvider);
        let contractWithSigner = contract.connect(walletSys);
        let tx = await contractWithSigner
            .mint(type, amount, toAddress)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.trace(err)
                logger.debug("err:%s", err);
                return err;
            });
        let recept = await customHttpProvider
            .waitForTransaction(tx.hash)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.trace(err)
                logger.debug("err:%s", err);
            });
        // logger.debug(recept);
        validate(recept.status === TRANSACTION_RECEIPT_STATUS.SUCCESS, "Transaction Reverted")
        return {err: null, hash: tx.hash};
    } catch (err) {
        console.trace(err)
        return {err: err, hash: null};
    }
}

module.exports = {
    createCollectV2, createCollectV2Call, collectInit, collectInitCall, sendCTI,
};
