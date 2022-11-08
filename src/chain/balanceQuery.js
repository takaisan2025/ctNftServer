const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
let web3 = web3o;
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(  {
        ...rpc
    }, {
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

let token = "0xfE29D35FA07f6e084a1C2FD0936fF231C0e8931E";
let from = "0xfE0E612A60e8A4477138faFfDE468488df42Ef1e";
let tokenId =
    "0xfE0E612A60e8A4477138faFfDE468488df42Ef1ec12345678901665214165979";

module.exports = {
    balanceQuery,
    queryBalanceAndTokenBalance
};
