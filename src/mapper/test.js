var format = {language: "sql", indent: "  "};

const {exec, escape} = require("../db/mysqlPool");

const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper(["src/mapper/xml/NftNonceMapper.xml"]);
const ethers = require("ethers");

async function queryNonce(address) {
    // Get SQL Statement

    var sql = mybatisMapper.getStatement(
        "NftNonceMapper",
        "selectByAddress",
        {address: address},
        format
    );
    return await exec(sql).then((rows) => {
        return rows || [];
    });
}

async function insertNonce(address, nonce) {
    var sql = mybatisMapper.getStatement(
        "NftNonceMapper",
        "insertSelective",
        {address: address, nonce: nonce},
        format
    );
    return await exec(sql).then((rows) => {
        return rows || null;
    });
}

function updateNonce(address, nonce) {
    var sql = mybatisMapper.getStatement(
        "NftNonceMapper",
        "updateByAddressSelective",
        {address: address, nonce: nonce},
        format
    );
    return exec(sql).then((rows) => {
        return rows || null;
    });
}

function delNonce(address) {
    var sql = mybatisMapper.getStatement(
        "NftNonceMapper",
        "deleteByAddress",
        {address: address},
        format
    );
    return exec(sql).then((rows) => {
        return rows || null;
    });
}

async function main() {
    console.log(process.env.a);
    // let reesult = await insertNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E52", 0);
    // let reesult = await updateNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D", 1);
    let reesult = await queryNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D");
    console.log(reesult[0].update_time.getTime());
    console.log(new Date().getTime());
    // let a = new Promise((resolve, reject) => {
    //     resolve("haha")
    // });
    // a.then(r => console.log(r))
    process.exit();
}

async function transferETH() {
}

function callback(progress) {
    console.log("Encrypting: " + parseInt(progress * 100) + "% complete");
}

const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

async function createAccount() {
    // let password = "12345678"
    // let randomWallet = ethers.Wallet.createRandom();
    // let keystore = await randomWallet.encrypt(password, callback);
    // console.log(keystore)

    var Web3 = require("web3");

    if (typeof web3 !== "undefined") {
        web3 = new Web3(web3.currentProvider);
    } else {
        // set the provider you want from Web3.providers
        // web3 = new Web3(new Web3.providers.HttpProvider("http://ctblock.cn/blockChain"));
        web3 = new Web3(
            new Web3.providers.HttpProvider(rpc.url, {
                headers: rpc.headers
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
// createAccount();
console.log("草田分余额不足:", "0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D")
noAddress = "草田分余额不足: 0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D".toString().trim().replace("草田分余额不足: ", '')
// noAddress = noAddress.slice(0,42)
// console.log(noAddress)
// console.log(1200000000000000000 / 10045)
// try {
//     throw "haha"
// }  catch (e) {
//     console.trace(e.stack)
// }
// node src/mapper/test.js
