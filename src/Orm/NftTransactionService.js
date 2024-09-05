"use strict";
const NftTransaction = require('./NftTransactionModel');
const {pro_err} = require("./pErr");


async function findNftTransaction(_param) {
    try {
        const nftTransactions = await NftTransaction.findAll(_param);
        return {err: null, result: nftTransactions};
    } catch (error) {
        console.trace(error)
        return {result: null, err: error};
    }
}

async function updateNftTransaction(_params, _where) {
    try {
        const res = await NftTransaction.update(_params, _where)
        return {err: null, result: res};
    } catch (error) {
        return {result: null, err: error};
    }
}

async function createNftTransaction(_obj) {
    try {
        const res = await NftTransaction.create(_obj)
        return {err: null, result: res};
    } catch (error) {
        return {result: null, err: pro_err(error)};
    }
}

// findAllNftTransactions()
// findNftTransaction(_where ={where:{status: 1}}).then(r => console.log(r.result[0]))
// findNftTransaction({where: {id: 6290103}}).then(r => console.log(JSON.parse(r.result[0].origin_value).name))
// updateNftTransaction(_params = {status: 1010}, {where: {id: 6290101}}).then(r => console.log(r))
module.exports = {
    findNftTransaction, updateNftTransaction, createNftTransaction
};

//
// NftTransaction.sync({
//     // create table if not exists
//     force: true
// }).then(() => {
//     // create new user
//     return NftTransaction.create({
//         firstName: 'Foo',
//         lastName: 'Bar',
//         nickname: 'foobar'
//     });
// }).then(user => {
//     console.log(user);
//     // update user
//     user.nickname = 'barfoo';
//     return user.save();
// }).then(() => {
//     // find the updated user
//     return NftTransaction.findOne({
//         where: {
//             nickname: 'barfoo'
//         }
//     });
// }).then(user => {
//     console.log(user);
//     // delete user
//     return user.destroy
// }).then(() => {
//     console.log('NftTransaction deleted...');
// }).catch(err => {
//     console.error('Error: ', err);
// });
