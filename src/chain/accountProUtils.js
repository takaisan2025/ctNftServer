const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const ethers = require("ethers");
const GlobalConfig = require("../config/GlobalConfig.json");
const {PasswordError} = require("./responseError");
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL,
    isEmpty
} = require("../rules/rules");
let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

async function getPriKey(account, password) {
    try {

        if (isEmpty(account.private_key).flag == true) {
            console.log(account.id)
            console.log(account.keystore)
            console.log(password)
            let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(account.keystore).toLowerCase()), password);
            return {err: null, result: wallet}
        } else {

            if (password != account.psd) {
                return {err: PasswordError, result: null}
            } else {
                return {
                    err: null, result: {
                        address: account.address,
                        privateKey: account.private_key,
                    }
                }
            }
        }

    } catch (e) {
        return {err: e.toString(), result: null}
    }

}

module.exports = {
    getPriKey
};
