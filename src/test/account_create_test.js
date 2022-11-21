const ethers = require("ethers");

function callback(progress) {
    // console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[2];

const {
    getPrivateKeyByAccountAndPassword
} = require("../chain/accountProUtils");
var Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
async function createAccountWeb3() {
    let password = "12345678";
    let startTime = new Date().getTime();
    var Web3 = require("web3");
    let web3o = new Web3("http://ctblock.cn/blockChain");
    let a = web3o.eth.accounts.create();
    let keystore = await a.encrypt(password);
    let midDate = new Date().getTime();
    console.log(midDate - startTime);
    // console.log(keystore);
    // password = "123456789";
    let keystoreA;
    try {
        keystoreA = await web3o.eth.accounts.decrypt(JSON.parse(JSON.stringify(keystore).toLowerCase()), password);
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

// createAccountWeb3();
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
const fetch = require("node-fetch");

async function haha() {

    // console.log("0xDD3ab80BC8C40ea5bF1cb4ef4f072026C2B221bAc12345678901667291169058")
    // let a = web3o.utils.hexToNumberString("0xDD3ab80BC8C40ea5bF1cb4ef4f072026C2B221bAc12345678901667291169058")
    // console.log(a)

    let result = ethers.utils.defaultAbiCoder.encode(
        [
            "address",
        ],
       [ "0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D"]
    );
    // 0x0000000000000000000000009771a512c1a17b6f61d661c37ba9797236493ce7
    // 0x000000000000000000000000cebcbf16494edbad87d7feab0260ade82c571e5d
    console.log(result)
   let aa =  ethers.utils.stripHexPrefix("0x000000000000000000000000cebcbf16494edbad87d7feab0260ade82c571e5d");
    console.log(aa)
    // const FormData = require("form-data");
    // var formdata = new FormData();
    // formdata.append("key", "qianyidata");
    // // console.log(tokenId)
    // formdata.append("status", "true");
    // var requestOptions = {
    //     method: "POST",
    //     body: formdata,
    //     redirect: "follow",
    //     headers: {
    //         'Accept':'application/json'
    //     }
    // };
    //
    // let url = "http://www.xingchengwlkj.com/api/notify/nftgoods"
    // let responseRet = await fetch(url, requestOptions)
    //     .then((response) => {
    //         console.log("回调返回原始内容status:", response.status);
    //         console.log("回调返回原始内容statusText:", response.statusText);
    //         console.log("回调返回原始内容statusText:", response.headers);
    //         return response.json();
    //     })
    //     .then((response) => {
    //         console.log("回调返回处理结果:", response);
    //         return {data: response};
    //     })
    //     .catch((err) => {
    //         console.trace("回调错误:", err, ",tokenId");
    //         return {data: null, err: err};
    //     });
    // console.log(responseRet)
}

haha();
// setInterval(haha, 3000)
