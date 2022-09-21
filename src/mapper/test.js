const web3 = require("web3");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL
} = require("../rules/rules");
let web3o = new web3("http://ctblock.cn/blockChain");
//
// console.log(web3o.eth.accounts.wallet._accounts)

// let premetadata = '{"author":"","authorDesc":"链上藏品","description":"","title":"链上藏品","toSkyDate":""}';
// console.log("premetadata", premetadata.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
// const reqdataRet = JSON.parse(premetadata.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
// console.log(reqdataRet)
const ethers = require("ethers");
// 通过定制 URL 连接 :

const GlobalConfig = require("../config/GlobalConfig.json");
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const fetch = require("node-fetch");

async function transactionQuery() {

    let hash = "0xb938b3a628ffba9b01f05adf820d43de834627c2c69edf6a3babb7d2ad6946d3";
    let req_url = "https://ctblock.cn/graphiql";
    let recept = await fetch(req_url, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({
            "query": `{transaction(hash: \"${hash}\") \n  \n  \n  { hash, error, status, blockNumber, value, gasUsed }}`,
            "variables": null,
            "operationName": null
        })
    })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log("Call Faild  reCall:", err);
            return err.type;
        });
    console.log(recept.data.transaction.status);

}

const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");

async function initGasGet() {
    let contract = new ethers.Contract(
        "0xeB3AD009272D6C5f045f3d5EaD0ef0e47930877d",
        ERC1155Ctnft.abi,
        customHttpProvider
    );
    // let contractWithSigner = contract.connect(wallet);
    let {err, gaslimit} = await contract.estimateGas
        .__ERC1155Ctnft_init("name", "symbol", "tokenUrlPrefix", "contractUrl", {from: "0x269153639cd53a0e41841801a149824c320f1d29"})
        .then((ret) => {
            return {err: null, gaslimit: ret};
        })
        .catch((err) => {
            console.log("err:", err);
            return {err: err, gaslimit: null};
        });
    console.log({err, gaslimit})
}

let a = 10;
var util = require('ethereumjs-util');

function calcContractAddress() {

    //0xbf9d2a3169293220b6b06f65a8642420ba1ff45b

    var addr2 = util.generateAddress(Buffer.from("269153639cd53a0e41841801a149824c320f1d29", "hex"), 98).toString("hex");
    console.log(addr2);

}
function paramTest() {
    let a = 10;
    a = 20;
    console.log(a);
    let a1 = (() => {
        let a = 30;
        return a;
    })()

    console.log(a1)
}

function main() {
    console.log(isJson({}))
}

main();
