const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeySys = GlobalConfig.FEE_ACCOUNT.private_key; // mint pri
const Web3 = require("web3");

const ethers = require("ethers");

const {customHttpProvider} = require("./taskConst");
const {setLock, renewLock, releaseLock} = require("../redis/redis-client");
const {sendAtPendingNonce} = require("../chain/signedOrderSender");
const {hasReservedTransferNonce} = require("../chain/transferNonceReservation");
const nonceLocks = {setLock, renewLock, releaseLock};

async function baoyueTransfer() {
    try {
        console.time("baoyueTransfer");

        const t_to = "0xa83dBC42739460488A1297D05AAb1f998f94D34D";
        let balanceC = await customHttpProvider.getBalance(t_to);
        console.log("链上查询余额")
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        let etherStringC = ethers.utils.formatEther(balanceC);
        console.log("当前余额:", etherStringC)
        if (Number(etherStringC) < Number(String(20000))) {
            console.log("当前余额不足，请充值")
            let walletSys = new ethers.Wallet(privateKeySys, customHttpProvider);

            let txs = {
                to: t_to,
                // ... or supports ENS names
                // to: "ricmoo.firefly.eth"
                // nonce: transactionCount1Mint,
                // We must pass in the amount as wei (1 ether = 1e18 wei), so we
                // use this convenience function to convert ether to wei.
                // gasPrice: Web3.utils.numberToHex(0),
                maxFeePerGas: Web3.utils.numberToHex(4800e9),
                maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
                value: ethers.utils.parseEther((20000).toString()),
            };
            let sent = await sendAtPendingNonce({
                locks: nonceLocks, provider: customHttpProvider,
                address: walletSys.address,
                hasReservation: nonce => hasReservedTransferNonce(walletSys.address, nonce),
                send: nonce => walletSys.sendTransaction({...txs, nonce})
            });
            if (sent.action !== "sent") return;
            let tx = sent.tx;
            console.log("Default 交易发送中:", tx.hash);
            console.log("txTransfer: :", tx.hash);
            console.log("hash:", tx.hash);
            console.timeEnd("baoyueTransfer")
        } else {
            console.log("当前余额充足，无需充值")
            console.timeEnd("baoyueTransfer")
        }
    } catch (e) {
        console.log(e)
    }
}

// baoyueTransfer()
module.exports = {
    baoyueTransfer
};
// node src/task/baoyueTask.js
