"use strict";const Account = require('./AccountModel');
const {pro_err} = require("./pErr");


async function findAccount(_where) {
    try {
        const account = await Account.findOne({
            where: _where
        });
        return {err: null, result: account};
    } catch (error) {
        return {result: null, err: error};
    }
}

async function findAccountAll(_where) {
    try {
        const account = await Account.findAll({
            where: _where,
            limit: 500
        });
        return {err: null, result: account};
    } catch (error) {
        return {result: null, err: error};
    }
}

async function updateAccount(_params, _where) {
    try {
        const res = await Account.update(_params, {
            where: _where
        })
        return {err: null, result: res};
    } catch (error) {
        return {result: null, err: error};
    }
}

async function createAccount(_account) {
    try {
        const res = await Account.create(_account)
        return {err: null, result: res};
    } catch (error) {
        return {result: null, err: pro_err(error)};
    }
}

// findAllAccounts()
// findAccount(_where ={status: 1}).then(r => console.log(r))
// findAccount(_where ={id: 452}).then(r => console.log(r))
// findAccount(_where = {address: '0x21366DB44c5C6Aebe8fE6005B3F599E561100740'}).then(r => console.log(r.result[0]))
// updateAccounts(_params = {status: 1010}, _where = {id: 6290101},).then(r => console.log(r))
module.exports = {
    findAccount, updateAccount, createAccount,findAccountAll
};

