"use strict"

const {countTrans} = require("../Orm/TransFormListService");

async function count_trans(_status) {
    //logic to find accounts
    try {

        let count = await countTrans({
            where: {
                t_status: _status
            }
        })
        return count.result
    } catch (e) {
        console.log("error", e)
        return  e.code
    }
}

module.exports = {
    count_trans
}
