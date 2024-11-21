"use strict"
const {createNft, findNft, countNft} = require("../Orm/NftService");
const {Op} = require('sequelize')
const {getKeys} = require("../redis/redis-client");

async function insert_nft(_lottery) {
    //logic to find accounts
    try {

        let nfts_ret = await createNft(_lottery)
        if (nfts_ret.err != null) {
            if (nfts_ret.result == "order_id must be unique") {
                return {err: "OrderId 冲突!", result: null}
            } else {
                return {err: "操作失败,请重试!", result: null}
            }
        } else {
            return {err: null, result: 1}
        }
    } catch (e) {
        console.trace(e)
        return {err: e.code, result: null}
    }
}

async function find_nfts(_tokenIds) {
    //logic to find accounts
    try {

        let nfts_ret = await findNft({
            tokenId: {
                [Op.in]: _tokenIds
            }
        })
        let nftArr = [];
        if (nfts_ret.err != null) {
            return {err: nfts_ret.result, result: null}
        } else {
            nftArr = nfts_ret.result;
        }
        return {err: null, result: nftArr}
    } catch (e) {
        console.trace(e)
        return {err: e.code, result: null}
    }
}

const date = new Date();

// 将日期向前调整 30 天
date.setDate(date.getDate() - 30);

async function count_nft(_status) {
    //logic to find accounts
    try {
        let andfrom = [];

        let newVar = await getKeys("BALANCE_*");
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }
        let count = await countNft({
            where: {
                status: _status,
                create_time: {
                    [Op.gte]: date
                }
            }
        })
        return count.result
    } catch (e) {

        console.trace(e)
        return e.code
    }
}

module.exports = {
    insert_nft,
    find_nfts,
    count_nft

}
