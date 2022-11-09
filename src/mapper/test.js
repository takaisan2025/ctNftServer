const ethers = require("ethers");

function callback(progress) {
    // console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[2];

const {
    getPrivateKeyByAccountAndPassword
} = require("../chain/accountProUtils");

async function createAccountWeb3() {
    let password = "FUtCWvBQXMeb6k^zEYLVt&vunqTSftN!EJnTGLF$rwpffJPmkD5rh\%e\%dHdRFh54"
    let startTime = new Date().getTime();
    var Web3 = require("web3");
    let web3o = new Web3("http://ctblock.cn/blockChain");
    let a = web3o.eth.accounts.create();
    let keystore = await a.encrypt(password);
    let midDate = new Date().getTime();
    console.log(midDate - startTime);
    console.log(password);
    // console.log(keystore);
    // password = "123456789";
    let keystoreA;
    try {
        // keystoreA = await web3o.eth.accounts.decrypt(JSON.parse(JSON.stringify(keystore).toLowerCase()), password);
        keystoreA = await web3o.eth.accounts.decrypt({"version":3,"id":"c4fc1133-7d10-4eb9-8533-2d00e5316dfe","address":"1e734ac6979d3849d463b9c1d06bc280acfe2dd1","crypto":{"ciphertext":"f27ec6f6cfbedfbb8626e0a731a7dadab8604fd0351c8b720df81812dad7a620","cipherparams":{"iv":"3eb2b395ab2f014458bd583ce93bdc2f"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"873f77d97a1586b964947f101891494a4b9621f9490477766b4f2f812fd24f9c","n":8192,"r":8,"p":1},"mac":"642d7dd2b505d6d040ea3d881b2850c8132ab3bb2bc3ae7e94ade32ccbb3e529"}}, password);
    } catch (e) {
        console.log(e.toString())
        return;
    }
    let midDate1 = new Date().getTime();
    console.log(midDate1 - midDate);
    console.log(keystoreA);
}

async function createAccountEthers() {
    let password = "12345678";
    let startTime = new Date().getTime();
    let randomWallet = ethers.Wallet.createRandom();
    let keystore = await randomWallet.encrypt(password, callback);
    let midDate = new Date().getTime();
    console.log(midDate - startTime);
    // console.log(JSON.parse(keystore));
    let keystoreA = await ethers.Wallet.fromEncryptedJson((keystore), password)
    let midDate1 = new Date().getTime();
    console.log(midDate1 - midDate);
    console.log(keystoreA.address);

}

async function createAccountX() {
    let password = "12345678";
    let startTime = new Date().getTime();
    let randomWallet = ethers.Wallet.createRandom();
    let keystore = await randomWallet.encrypt(password, callback);
    let midDate = new Date().getTime();
    console.log(midDate - startTime);
    // console.log(JSON.parse(keystore));
    var Web3 = require("web3");
    let web3o = new Web3("http://ctblock.cn/blockChain");
    let keystoreA = await web3o.eth.accounts.decrypt(JSON.parse(JSON.stringify(keystore).toLowerCase()), password);
    let midDate1 = new Date().getTime();
    console.log(midDate1 - midDate);
    console.log(keystoreA);

}

async function createAccountXX() {
    let password = "12345678";
    let startTime = new Date().getTime();
    var Web3 = require("web3");
    let web3o = new Web3("http://ctblock.cn/blockChain");
    let a = web3o.eth.accounts.create();
    let keystore = await a.encrypt(password);
    let midDate = new Date().getTime();
    console.log(midDate - startTime);
    // console.log(JSON.parse(keystore));
    let keystoreA = await ethers.Wallet.fromEncryptedJson(JSON.stringify(keystore), password)
    let midDate1 = new Date().getTime();
    console.log(midDate1 - midDate);
    console.log(keystoreA);

}

createAccountWeb3();
// createAccountEthers();
// createAccountX();
// createAccountXX();

// judge mint node is't account can to transfer
async function testMintNodeHasUnlockAccount() {
    var Web3 = require("web3");

    let web3;
    if (typeof web3 !== "undefined") {
        web3 = new Web3(web3.currentProvider);
    } else {
        // set the provider you want from Web3.providers
        // web3 = new Web3(new Web3.providers.HttpProvider("http://ctblock.cn/blockChain"));
        web3 = new Web3(
            new Web3.providers.HttpProvider(rpc.url, {
                headers: rpc.headers,
            })
        );
    }
    web3.eth.getAccounts(console.log);
    web3.eth.isSyncing(console.log);
    web3.eth.isMining(console.log);
    web3.eth.getCoinbase(console.log);
    web3.eth.getNodeInfo(console.log);
    web3.eth.sendTransaction(
        {
            from: "0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D",
            to: "0xC5d8ac2F419A10CF618Fd152F09779b5Aa884724",
            value: "1000000000000000000",
        },
        console.log
    );
}

// main();

// transferETH()

// console.log("草田分余额不足:", "0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D")
// noAddress = "草田分余额不足: 0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D".toString().trim().replace("草田分余额不足: ", '')
// noAddress = noAddress.slice(0,42)
// console.log(noAddress)
// console.log(1200000000000000000 / 10045)
// try {
//     throw "haha"
// }  catch (e) {
//     console.trace(e.stack)
// }
// node src/mapper/test.js
// const searchRegExp = new RegExp("\\\\\"", 'g') // // 抛出 SyntaxError 异常
// console.log('{\\"title\\":\\"WFT藏品\\",\\"description\\":\\"藏品描述\\",\\"author\\":\\"jia\\",\\"authorDesc\\":\\"jiajiajiajia\\",\\"toSkyDate\\":\\"自定义字段\\"}'.replace(searchRegExp, '"'))
