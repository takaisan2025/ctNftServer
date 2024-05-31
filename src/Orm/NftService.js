const Nft = require('./NftModel');

async function findNft(_where) {
    try {
        const account = await Nft.findAll({
            where: _where
        });
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function findNftAll(_param) {
    try {
        const account = await Nft.findAll(_param);
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function updateNft(_params, _where) {
    try {
        const res = await Nft.update(_params, {
            where: _where
        })
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function createNft(_lottery) {
    try {
        const res = Nft.create(_lottery)
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}


module.exports = {
    findNft, updateNft, createNft,findNftAll
};

