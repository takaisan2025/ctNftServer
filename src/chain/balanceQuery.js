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
                                           tokenId,
                                           type) {

    let newVar = await getString("queryAccountBalance+" + tokenId + from + token);
    if (newVar) {
        return {
            err: null,
            data: JSON.parse(newVar)
        };
    } else {
        try {
            let collectAddress = "0x1708e7553B162cbb1aE081a693622C9d5A850ac4";

            let contract = new ethers.Contract(
                collectAddress,
                CtMultCall.abi,   // 10 和 12 是同一个abi
                customHttpProvider
            );

            let accountBalance = await contract.queryBalanceAndTokenBalance(
                from,
                token,
                tokenId,
                type
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

async function queryBalance(from) {

    let newVar = await getString("queryBalance_" + from);
    if (newVar) {
        console.log("缓存获取余额")
        return newVar;
    } else {
        let balanceC = await customHttpProvider.getBalance(from);
        console.log("链上查询余额")
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        let etherStringC = ethers.utils.formatEther(balanceC);
        await setString("queryBalance_" + from, etherStringC, 2);
        return etherStringC;

    }

}

let token = "0xfE29D35FA07f6e084a1C2FD0936fF231C0e8931E";
let from = "0xfE0E612A60e8A4477138faFfDE468488df42Ef1e";
let tokenId =
    "0xfE0E612A60e8A4477138faFfDE468488df42Ef1ec12345678901665214165979";
module.exports = {
    balanceQuery,
    queryBalanceAndTokenBalance,
    queryBalance
};
