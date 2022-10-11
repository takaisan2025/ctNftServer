const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
let web3 = web3o;
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtMultCall = require("../contract/CtMultCall.json");

async function balanceQuery(address, collectAddress, tokenId) {
    try {
        let contract = new ethers.Contract(
            collectAddress,
            ERC1155Ctnft.abi,   // 10 和 12 是同一个abi
            customHttpProvider
        );

        let accountBalance = await contract.balanceOf(
            address,
            tokenId
        );
        return {
            err: null,
            data: web3.utils.hexToNumberString(accountBalance)
        };
    } catch (err) {
        return {err: err, data: null}

    }

}

async function queryBalanceAndTokenBalance(from,
                                           token,
                                           tokenId) {

    let collectAddress = "0xdB9dE66f90fF872b4d8e33b7443D5B566ffb28D3";
    try {
        let contract = new ethers.Contract(
            collectAddress,
            CtMultCall.abi,   // 10 和 12 是同一个abi
            customHttpProvider
        );

        let accountBalance = await contract.queryBalanceAndTokenBalance(
            from,
            token,
            tokenId
        );
        return {
            err: null,
            data: accountBalance
        };
    } catch (err) {
        return {err: err, data: null}

    }
}

// let address = "0x01063da4afFa46c59B9e1e1004Cd255CBC593FbE"
// let collectAddress = "0x304492717e0e045d76ac5516aa1246c3de13f94a";
// let tokenId = "0x01063da4afFa46c59B9e1e1004Cd255CBC593FbEc12345678901665019504790"
// // balanceQuery(address, collectAddress, tokenId).then(r => console.log("余额:", r));
// queryBalanceAndTokenBalance(address, collectAddress, tokenId).then(r => {
//     console.log("余额:", r)
//     console.log("余额:", ethers.utils.formatEther(web3.utils.hexToNumberString(r.data.balance)))
//     console.log("余额:", web3.utils.hexToNumberString(r.data.tokenBalance))
// });
module.exports = {
    balanceQuery,
    queryBalanceAndTokenBalance
};