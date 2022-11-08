const Web3 = require("web3");
let web3o = new Web3("http://ctblock.cn/blockChain");
let web3 = web3o;
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

async function getPrivateKeyByAccountAndPassword(account, password) {
    try {

        if (isEmpty(account.private_key).flag == true) {
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
    getPrivateKeyByAccountAndPassword
};
