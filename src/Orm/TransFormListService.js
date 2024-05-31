const TransFormList = require('./TransFormListModel');

async function findTransFormList(_where) {
    try {
        const account = await TransFormList.findAll({
            where: _where
        });
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function findTransFormListAll(_param) {
    try {
        const account = await TransFormList.findAll(_param);
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function updateTransFormList(_params, _where) {
    try {
        const res = await TransFormList.update(_params, {
            where: _where
        })
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function createTransFormList(_lottery) {
    try {
        const res = TransFormList.create(_lottery)
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}


module.exports = {
    findTransFormList, updateTransFormList, createTransFormList,findTransFormListAll
};

