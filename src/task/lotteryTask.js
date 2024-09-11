const Web3 = require("web3");
const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeyLottery =
    ""; // lottery pri
let collectAddress = ""
const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const Lottery = require("../contract/Lottery.json");
const ethers = require("ethers");
const {customHttpProvider} = require("./taskConst");
const {validate} = require("../routers/fcommon");
let gasPrice = "5000100000000";
let isGasPrice = false;

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function setSettleTask() {

    let wallet = new ethers.Wallet(privateKeyLottery, customHttpProvider);
    if (!isGasPrice) {
        gasPrice = (await customHttpProvider.getGasPrice()).toString();
        isGasPrice = true;
    }
    let contract = new ethers.Contract(
        collectAddress,
        Lottery.abi,
        customHttpProvider
    );
    // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
    let contractWithSigner = contract.connect(wallet);
    let gasLimit = await contractWithSigner.estimateGas
        .setSettle()
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
        });
    console.log("gasLimit:", gasLimit.toString());
    console.log("gasPrice*:", gasPrice * gasLimit);
    let overrides = {
        // The maximum units of gas for the transaction to use
        gasLimit: Web3.utils.numberToHex(gasLimit),
        // The price (in wei) per unit of gas
        gasPrice: Web3.utils.numberToHex(4800e9),
        // The nonce to use in the transaction
        // nonce: nonce,
        // nonce: transactionCount1Mint,
        // The amount to send with the transaction (i.e. msg.value)
        // value: utils.parseEther('1.0'),
        // The chain ID (or network ID) to use
        // chainId: 27
    };
    // 设置一个新值，返回交易
    let tx = await contractWithSigner
        .setSettle(overrides)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
            return err;
        });
    // console.log("tx:", tx.toString().startsWith('0x'))
    console.log("tx:", tx);
    if (
        tx.toString().indexOf("already known") != -1 ||
        tx.toString().indexOf("token already minted") != -1 ||
        !tx.hash
    ) {
        console.log("tx:", tx.hash);
    }
    // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364

    console.log("hash:", tx.hash);
    // 操作还没完成，需要等待挖矿
    let recept = await customHttpProvider
        .waitForTransaction(tx.hash)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
        });
    console.log(recept);
    validate(recept.status === TRANSACTION_RECEIPT_STATUS.SUCCESS, "Transaction Reverted")

    console.log("setSettleTask All Done!");
    setTimeout(() => {
        resetTask();
    }, 20000);
    return;
}

async function resetTask() {

    let wallet = new ethers.Wallet(privateKeyLottery, customHttpProvider);
    if (!isGasPrice) {
        gasPrice = (await customHttpProvider.getGasPrice()).toString();
        isGasPrice = true;
    }
    let contract = new ethers.Contract(
        collectAddress,
        Lottery.abi,
        customHttpProvider
    );
    // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
    let contractWithSigner = contract.connect(wallet);
    let gasLimit = await contractWithSigner.estimateGas
        .reset()
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
        });
    console.log("gasLimit:", gasLimit.toString());
    console.log("gasPrice*:", gasPrice * gasLimit);
    let overrides = {
        // The maximum units of gas for the transaction to use
        gasLimit: Web3.utils.numberToHex(gasLimit),
        // The price (in wei) per unit of gas
        gasPrice: Web3.utils.numberToHex(4800e9),
        // The nonce to use in the transaction
        // nonce: nonce,
        // nonce: transactionCount1Mint,
        // The amount to send with the transaction (i.e. msg.value)
        // value: utils.parseEther('1.0'),
        // The chain ID (or network ID) to use
        // chainId: 27
    };
    // 设置一个新值，返回交易
    let tx = await contractWithSigner
        .reset(overrides)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
            return err;
        });
    // console.log("tx:", tx.toString().startsWith('0x'))
    console.log("tx:", tx);
    if (
        tx.toString().indexOf("already known") != -1 ||
        tx.toString().indexOf("token already minted") != -1 ||
        !tx.hash
    ) {
        console.log("tx:", tx.hash);
    }
    // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364

    console.log("hash:", tx.hash);
    // 操作还没完成，需要等待挖矿
    let recept = await customHttpProvider
        .waitForTransaction(tx.hash)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("err:", err);
        });
    console.log(recept);
    validate(recept.status === TRANSACTION_RECEIPT_STATUS.SUCCESS, "Transaction Reverted")
    console.log("resetTask All Done!");
}

//TEST
setSettleTask();
// resetTask();
