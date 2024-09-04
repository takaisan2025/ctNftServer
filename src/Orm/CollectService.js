"use strict";const Collect = require('./CollectModel');
const {pro_err} = require("./pErr");

async function findCollect(_where) {
    try {
        const account = await Collect.findOne({
            where: _where
        });
        return {err: null, result: account};
    } catch (error) {
        return {result: null,err: error};
    }
}

async function findCollectAll(_param) {
    try {
        const account = await Collect.findAll(_param);
        return {err: null, result: account};
    } catch (error) {
        return {result: null,err: error};
    }
}

async function updateCollect(_params, _where) {
    try {
        const res = await Collect.update(_params, {
            where: _where
        })
        return {err: null, result: res};
    } catch (error) {
        return {result: null,err: error};
    }
}

async function createCollect(_lottery) {
    try {
        const res = await Collect.create(_lottery)
        return {err: null, result: res};
    } catch (error) {
        return {result: null,err: pro_err(error)};
    }
}


module.exports = {
    findCollect, updateCollect, createCollect,findCollectAll
};

