"use strict"
const {Op} = require('sequelize')
const {countTrans} = require("../Orm/TransFormListService");
const date = new Date();

// 将日期向前调整 30 天
date.setDate(date.getDate() - 30);

async function count_trans(_status) {
    //logic to find accounts
    try {

        let count = await countTrans({
            where: {
                t_status: _status,
                create_time: {
                    [Op.gte]: date
                }
            }
        })
        return count.result
    } catch (e) {

        console.trace(e)
        return  e.code
    }
}

module.exports = {
    count_trans
}
