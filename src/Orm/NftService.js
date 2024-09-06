"use strict";
const Nft = require('./NftModel');
const {pro_err} = require("./pErr");

async function findNft(_where) {
    try {
        const account = await Nft.findAll({
            where: _where
        });
        return {err: null, result: account};
    } catch (error) {
        console.trace(error)
        return {result: null, err: error};
    }
}

async function findNftAll(_param) {
    try {
        const account = await Nft.findAll(_param);
        return {err: null, result: account};
    } catch (error) {
        console.trace(error)
        return {result: null, err: error};
    }
}

async function updateNft(_params, _where) {
    try {
        const res = await Nft.update(_params, {
            where: _where
        })
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null, err: error};
    }
}

async function createNft(_lottery) {
    try {
        const res = await Nft.create(_lottery)
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null, err: pro_err(error)};
    }
}

async function countNft(_where) {
    try {
        const res = await Nft.count(_where)
        return {err: null, result: res};
    } catch (error) {
        console.trace(error)
        return {result: null, err: pro_err(error)};
    }
}


module.exports = {
    findNft, updateNft, createNft, findNftAll, countNft
};

