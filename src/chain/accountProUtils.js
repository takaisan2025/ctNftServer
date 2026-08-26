"use strict";const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const {PasswordError} = require("./responseError");
const {
    isEmpty
} = require("../rules/rules");
const {
    getString,
    setString,
} = require("../redis/redis-client");
const pino = require("pino");
const logger = pino({level: process.env.LOG_LEVEL || "debug"});
async function getPriKey(account, password) {
    try {

        if (isEmpty(account.private_key)) {

            let privateKeyByRedis = await getString("PRIVATE_KEY" + account.address + "_" + password);

            if (isEmpty(privateKeyByRedis)) {
            // if (true) {
                logger.debug("Decode privateKey, no found key!:%s", account.address);
                let wallet = await web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(account.keystore).toLowerCase()), password);
                // 这里进行redis缓存, 如果没有出错
                await setString("PRIVATE_KEY" + account.address + "_" + password, wallet.privateKey, 60)
                return {err: null, result: wallet}
            } else {
                logger.debug("Decode privateKey, found key!:%s", account.address);

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
        console.trace(e)
        return {err: e.toString(), result: null}
    }

}

module.exports = {
    getPriKey
};
