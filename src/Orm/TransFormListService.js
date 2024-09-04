"use strict";const TransFormList = require('./TransFormListModel');
const {pro_err} = require("./pErr");
const Nft = require("./NftModel");

async function findTransFormList(_where) {
    try {
        const account = await TransFormList.findOne({
            where: _where
        });
        return {err: null, result: account};
    } catch (error) {
        console.trace(error)
        return {result: null,err: error};
    }
}

async function findTransFormListAll(_param) {
    try {
        const account = await TransFormList.findAll(_param);
        return {err: null, result: account};
    } catch (error) {
        console.trace(error)
        return {result: null,err: error};
    }
}

async function findTransFormListOne(_param) {
    try {
        const account = await TransFormList.findOne(_param);
        return {err: null, result: account};
    } catch (error) {
        console.trace(error)
        return {result: null,err: error};
    }
}

async function updateTransFormList(_params, _where) {
    try {
        const res = await TransFormList.update(_params, {
            where: _where
        })
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null,err: error};
    }
}

async function createTransFormList(_lottery) {
    try {
        const res = await TransFormList.create(_lottery)
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null,err: pro_err(error)};
    }
}
async function countTrans(_where) {
    try {
        const res = await TransFormList.count(_where)
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null, err: pro_err(error)};
    }
}


module.exports = {
    findTransFormList, updateTransFormList, createTransFormList, findTransFormListAll, findTransFormListOne, countTrans
};

