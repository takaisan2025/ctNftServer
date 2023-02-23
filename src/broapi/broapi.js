const fetch = require("node-fetch");
const Web3 = require("web3");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL
} = require("../rules/rules");
let web3 = new Web3("http://ctblock.cn/blockChain");
async function graphiqlHashQuery(hash) {
    let req_url = "https://ctblock.cn/graphiql";
    let receptRet = await fetch(req_url, {
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
            return {err: null, data: response};
        })
        .catch((err) => {
            console.log("查询hash失败:", err);
            return {err: err, data: null};
        });
    return receptRet;
}

async function nodeHashQuery() {

}

module.exports = {
    graphiqlHashQuery,
    nodeHashQuery
};
