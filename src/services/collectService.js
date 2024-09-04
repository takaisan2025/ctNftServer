const {findAccount} = require("../Orm/AccountService");
const {responseFunStr} = require("../mapper/account");
const {findCollect, createCollect} = require("../Orm/CollectService");
const {createNft} = require("../Orm/NftService");

async function insert_collect(_lottery) {
    //logic to find accounts
    try {

        let nfts_ret = await createCollect(_lottery)
        if (nfts_ret.err != null) {
            return {err: JSON.stringify(nfts_ret.err), result: null}
        } else {
            return {err: null, result: 1}
        }
    } catch (e) {
        console.log("error", e.code)
        return {err: e.code, result: null}
    }
}

async function find_collect(_address) {
    //logic to find accounts
    try {

        let nfts_ret = await findCollect(_where = {address: _address})

        let account = null;
        if (nfts_ret.err === 0) {
            return {err: nfts_ret.err.code, result: null}
        } else {
                account = nfts_ret.result
        }
        return {err: null, result: account}
    } catch (e) {
        console.log("error", e.code)
        return {err: e.code, result: null}
    }
}

module.exports = {
    find_collect,
    insert_collect
}
