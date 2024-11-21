"use strict"
const {Op} = require('sequelize')
const {countTrans} = require("../Orm/TransFormListService");
const {getKeys} = require("../redis/redis-client");

async function count_trans(_status) {
    const date = new Date();

// 将日期向前调整 30 天
    date.setDate(date.getDate() - 30);

    //logic to find accounts
    try {

        let newVar = await getKeys("BALANCE_*");

        let andfrom = [];
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }

        let count = await countTrans({
            where: {
                t_status: _status,
                create_time: {
                    [Op.gte]: date
                },
                t_from: {
                    [Op.not]: andfrom
                },
                collectAddress: {
                    [Op.not]: andfrom
                }
            }
        })
        return count.result
    } catch (e) {

        console.trace(e)
        return  e.code
    }
}

async function count_trans_foo(_status) {
    //logic to find accounts
    try {
        const date = new Date();

// 将日期向前调整 30 天
        date.setDate(date.getDate() - 5);

        let newVar = await getKeys("BALANCE_*");

        let andfrom = [];
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }

        let count = await countTrans({
            where: {
                t_status: _status,
                create_time: {
                    [Op.gte]: date
                },
                t_from: {
                    [Op.not]: andfrom
                },
                collectAddress: {
                    [Op.not]: andfrom
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
    count_trans,
    count_trans_foo
}
