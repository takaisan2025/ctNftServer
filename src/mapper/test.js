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
const {
    graphiqlHashQuery
} = require("../broapi/broapi");
const GlobalConfig = require("../config/GlobalConfig.json");
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});
const fetch = require("node-fetch");

async function transactionQuery() {

    let hash = "0x52921ed34c1432da9d75580efb8ee7ea63efd038b557cada993421ff3acf8b8f";
    let receptRet = await graphiqlHashQuery(hash);
    let recept = receptRet.data;

    if (receptRet.data.err == null && recept.data.transaction != null) {
        console.log(recept.data.transaction);
    }

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

async function trabackTest() {
    // let response = await fetch("http://testh5.yixwkj.cn/block/nfcorder/notify", {})
    let response = await fetch("http://", {})
        .then((response) => {
            console.log("回调返回原始内容:", response.status);
            console.log("回调返回原始内容:", response.statusText);
            console.log("回调返回原始内容:", response);

            return response.json();
        })
        .then((response) => {
            console.log("回调返回处理结果:", response);
            return response;
        })
        .catch((err) => {
            console.log("回调错误:", err, ",tokenId");
            return null;
        });
}

async function main() {
    // let a = web3.utils.hexToNumberString("0x8a49953b8e1012d7c1c03fe60571ee073fea9a50c12345678901663921798949")
    //   console.log(a)
    //   let hash = "0x09131a08a1a1131fe08fa391804aec3d7e9eb5a352937e76811c037d89400c33";
    //   let receptRet = await graphiqlHashQuery(hash);
    //   let recept = receptRet.data;
    //   if (receptRet.err == null && recept.data.transaction != null) {
    //       console.log(recept.data.transaction);
    //       if (recept.data.transaction != null && recept.data.transaction.gasUsed == null) {
    //           console.log(recept.data.transaction);
    //
    //       } else {
    //           // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
    //           // save db
    //           let t_statusStorage;
    //           // if (recept.data.transaction == null || recept.data.transaction.status == null) {
    //           if (recept.data.transaction != null && recept.data.transaction.status == null) {
    //               // t_statusStorage = 7;
    //               formatTime(new Date());
    //               console.log("查询hash结果为空,", hash);
    //           } else {
    //
    //               if (recept.data.transaction.status == "ERROR") {
    //                   console.log("hash出错:", recept.data.transaction);
    //                   if ("dropped/replaced" == recept.data.transaction.error) {
    //                       t_statusStorage = 1;
    //                   } else {
    //                       t_statusStorage = 7;
    //                   }
    //
    //               } else if (recept.data.transaction.status == "OK") {
    //                   t_statusStorage = 6;
    //               }
    //           }
    //
    //           let trans_from_obj = {
    //               t_status: t_statusStorage, // 6 成功,7 失败
    //           };
    //           console.log("nftUpdateSelective:", trans_from_obj);
    //
    //       }
    //
    //   }
    let a = "undefined";
    console.log(a.gasUsed == null)
}

// console.log(checkURL("https://chaonft.cn/index.php?a=NftChainTransReturn"))
// console.log(checkURL("http://gdu.com"))
// transactionQuery()
main();
