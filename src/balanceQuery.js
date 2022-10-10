const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
let web3 = web3o;
const ethers = require("ethers");
const GlobalConfig = require("./config/GlobalConfig.json");
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

const ERC1155Ctnft = require("./contract/ERC1155Ctnft.json");
let collectAddress = "0xfE29D35FA07f6e084a1C2FD0936fF231C0e8931E";

async function balanceQuery(address, tokenId) {
    let contract = new ethers.Contract(
        collectAddress,
        ERC1155Ctnft.abi,   // 10 和 12 是同一个abi
        customHttpProvider
    );

    let accountBalance = await contract.balanceOf(
        address,
        tokenId
    );

    return web3.utils.hexToNumberString(accountBalance);
}

let address = "0xfE0E612A60e8A4477138faFfDE468488df42Ef1e"
let tokenId = "0xfE0E612A60e8A4477138faFfDE468488df42Ef1ec12345678901663644651607"
balanceQuery(address, tokenId).then(r => console.log("余额:", r));