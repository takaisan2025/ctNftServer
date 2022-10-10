const Web3 = require("web3");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL
} = require("../rules/rules");
let web3o = new Web3("http://ctblock.cn/blockChain");
// let web3o = new Web3("https://exploder.coozw.com/blockChain");
let web3 = web3o;
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

async function test1() {
    let a = web3.utils.hexToNumberString("0xa627fc3ce27724c5ec602c7ff4249ae1ff0845e65bbd2ac0acfe3a341f75d6b9")
    console.log(a)
    // let hash = "0xc6e12a73deee454e83c81e750429e16350a21b80453506149f24e5612f788588";
    let hash = "0x3de1f2c35fd8d6bcd7d896fa12b6c72ecf165e40f44debb197824bf4a3ac15c4";
    let receptRet = await graphiqlHashQuery(hash);
    let recept = receptRet.data;
    console.log(recept.data.transaction);
    if (receptRet.err == null && recept.data.transaction != null) {
        console.log(recept.data.transaction);
        if (recept.data.transaction != null && recept.data.transaction.gasUsed == null) {
            console.log(recept.data.transaction);

        } else {
            // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
            // save db
            let t_statusStorage;
            // if (recept.data.transaction == null || recept.data.transaction.status == null) {
            if (recept.data.transaction != null && recept.data.transaction.status == null) {
                // t_statusStorage = 7;
                formatTime(new Date());
                console.log("查询hash结果为空,", hash);
            } else {

                if (recept.data.transaction.status == "ERROR") {
                    console.log("hash出错:", recept.data.transaction);
                    if ("dropped/replaced" == recept.data.transaction.error) {
                        t_statusStorage = 1;
                    } else {
                        t_statusStorage = 7;
                    }

                } else if (recept.data.transaction.status == "OK") {
                    t_statusStorage = 6;
                }
            }

            let trans_from_obj = {
                t_status: t_statusStorage, // 6 成功,7 失败
            };
            console.log("nftUpdateSelective:", trans_from_obj);

        }

    }
    // let a = "undefined";
    // console.log(a.gasUsed == null)
}

// console.log(checkURL("https://chaonft.cn/index.php?a=NftChainTransReturn"))
// console.log(checkURL("http://gdu.com"))
// transactionQuery()
async function defaultAccount() {
    // let receptRet = {
    //     "data": {
    //         "data": {
    //             "transaction": null
    //         }
    //     },
    //     err: null
    // };
    // let recept = receptRet.data;
    // if (receptRet.err == null && recept && recept.data && recept.data.transaction == null) {
    //     console.log(1)
    // }
    console.log(web3o.eth.defaultAccount)
}

function formatTime(date) {
    console.log("formatTime", date)
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`

}

function main() {
    // var contract = new web3.eth.Contract(abi, address);
    let startTime = new Date().getTime();
    console.log(startTime)
    var batch = new web3.BatchRequest();
    // EVM的系统数据，参数放在request的方法里,不带参数的，只有回调函数
    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {
        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));
    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));
    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.add(web3.eth.getTransactionReceipt.request("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af", 'latest', (err, result) => {

        console.log(new Date().getTime() - startTime);
        console.log("b2 ----" + result)
    }));

    batch.execute();
    console.log(new Date().getTime() - startTime);
}

async function main1() {
    let startTime = new Date().getTime();
    console.log(startTime)
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await web3.eth.getTransactionReceipt("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    let endTime = new Date().getTime();
    console.log(endTime)
    console.log(endTime - startTime)

}

async function main2() {
    let startTime = new Date().getTime();
    console.log(startTime)
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    console.log(await graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"))
    let endTime = new Date().getTime();
    console.log(endTime)
    console.log(endTime - startTime)
}

function main3() {
    let gasLimit = web3.utils.hexToNumberString('0xfE0E612A60e8A4477138faFfDE468488df42Ef1ec12345678901663644651607');
    console.log(gasLimit)
}

function main4() {
    // var contract = new web3.eth.Contract(abi, address);
    let startTime = new Date().getTime();
    console.log(startTime)
    var batch = new web3.BatchRequest();
    // EVM的系统数据，参数放在request的方法里,不带参数的，只有回调函数
    batch.add(graphiqlHashQuery("0x6be4dbc7939b19a42402f74884cbd58af9d1ba994463c23cac759f8a1192a0af"), (err, result) => {
        console.log(new Date().getTime() - startTime);
        console.log(err)
        console.log(result)
        // console.log(result.status == true)
        // console.log(result.transactionHash)
    });

    batch.execute();
}

// 不限制监听数量
process.setMaxListeners(0)

function handleFetchQueue(urls, max, callback) {
    const urlCount = urls.length;
    const requestsQueue = [];
    const results = [];
    let i = 0;
    const handleRequest = (url) => {
        if(url != undefined) {
            console.log('当前并发： ',url);
            const req = fetch(url.url).then(res => {
                return res.json()
            }).then(res => {
                console.log('当前并发： ');
                console.log(requestsQueue);
                const len = results.push({ret: res, id: url.id});
                if (len < urlCount && i + 1 < urlCount) {
                    requestsQueue.shift();
                    handleRequest(urls[++i])
                } else if (len === urlCount) {
                    'function' === typeof callback && callback(results)
                }
            }).catch(e => {
                results.push({err: e, id: url.id})
            });
            if (requestsQueue.push(req) < max) {
                handleRequest(urls[++i])
            }
        }

    };
    handleRequest(urls[i])
}


// const fetch = function (idx) {
//     return new Promise(resolve => {
//         console.log(`start request ${idx}`);
//         const timeout = parseInt(Math.random() * 1e4);
//         setTimeout(() => {
//             console.log(`end request ${idx}`);
//             resolve(idx)
//         }, timeout)
//     })
// };

const max = 6;

const urls = [
    {
        url: "http://ctblock.cn/api?module=account&action=tokenlist&address=0x269153639cd53a0e41841801a149824c320f1d29",
        id: 1
    },
    {
        url: "http://ctblock.cn/api?module=account&action=tokenlist&address=0x269153639cd53a0e41841801a149824c320f1d29",
        id: 2
    },
    {
        url: "http://ctblock.cn/api?module=account&action=tokenlist&address=0x269153639cd53a0e41841801a149824c320f1d29",
        id: 3
    },
    {
        url: "http://ctblock.cn/api?module=account&action=tokenlist&address=0x269153639cd53a0e41841801a149824c320f1d29",
        id: 4
    },
    {
        url: "http://ctblock.cn/api?module=account&action=tokenlist&address=0x269153639cd53a0e41841801a149824c320f1d29",
        id: 5
    }];

function callback(result) {
    console.log('run callback');
    console.log(result);
};


// handleFetchQueue(urls, max, callback);
// main();
// main1();
// main2();
// defaultAccount()
main3()
// main4()
// console.log(null.status == true)
function main5() {
    const FormData = require("form-data");
    let formdata = new FormData(this);
    FormData.set("a","a")

    console.log(formdata.get("a"))
    console.log(formdata);
}
// main5()