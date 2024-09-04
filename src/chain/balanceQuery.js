const Web3 = require("web3");

const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const {customHttpProvider} = require("../task/taskConst");
const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtMultCall = require("../contract/CtMultCall.json");
const {getString, setString} = require("../redis/redis-client");
const {RESPONSE_STATUS} = require("./responseError");
const {responseFun} = require("../mapper/account");

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
            data: Web3.utils.hexToNumberString(accountBalance)
        };
    } catch (err) {

        console.trace(err)
        return {err: err, data: null}

    }

}

async function queryBalanceAndTokenBalance(from,
                                           token,
                                           tokenId) {

    let newVar = await getString("queryAccountBalance+" + tokenId + from + token);
    if (newVar) {
        return {
            err: null,
            data: JSON.parse(newVar)
        };
    } else {
        try {
            let collectAddress = "0xdB9dE66f90fF872b4d8e33b7443D5B566ffb28D3";

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
            let result = {
                balance: ethers.utils.formatEther(accountBalance[0]),
                tokenBalance: Web3.utils.hexToNumberString(accountBalance[1])
            }
            await setString("queryAccountBalance+" + tokenId + from + token, JSON.stringify(result), 5);
            return {
                err: null,
                data: result
            };
        } catch (err) {

            console.trace(err)
            return {err: err, data: null}

        }
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
