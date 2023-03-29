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
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");

async function getPriKey(account, password) {
    try {

        if (isEmpty(account.private_key).flag == true) {

            let privateKeyByRedis = await getString("PRIVATE_KEY" + account.address + "_" + password);

            if (isEmpty(privateKeyByRedis).flag == true) {
            // if (true) {
                console.log("解析私钥, 未命中redis!")
                let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(account.keystore).toLowerCase()), password);
                // 这里进行redis缓存, 如果没有出错
                await setString("PRIVATE_KEY" + account.address + "_" + password, wallet.privateKey, 300)
                return {err: null, result: wallet}
            } else {
                console.log("解析私钥, hahaha命中redis!")

                return {
                    err: null, result: {
                        address: account.address,
                        privateKey: privateKeyByRedis,
                    }
                }
            }


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
