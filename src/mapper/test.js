const web3 = require("web3");

let web3o = new web3("http://ctblock.cn/blockChain");

console.log(web3o.eth.accounts.wallet._accounts)
