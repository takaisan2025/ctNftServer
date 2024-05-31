const Collect = require('./CollectModel');

async function findCollect(_where) {
    try {
        const account = await Collect.findAll({
            where: _where
        });
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function findCollectAll(_param) {
    try {
        const account = await Collect.findAll(_param);
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function updateCollect(_params, _where) {
    try {
        const res = await Collect.update(_params, {
            where: _where
        })
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function createCollect(_lottery) {
    try {
        const res = Collect.create(_lottery)
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}


module.exports = {
    findCollect, updateCollect, createCollect,findCollectAll
};

