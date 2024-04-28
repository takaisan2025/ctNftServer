const Account = require('./AccountModel');


async function findAccount(_where) {
    try {
        const account = await Account.findAll({
            where: _where
        });
        return {code: 0, result: account};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function updateAccount(_params, _where) {
    try {
        const res = await Account.update(_params, {
            where: _where
        })
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}

async function createAccount(_account) {
    try {
        const res = Account.create(_account)
        return {code: 0, result: res};
    } catch (error) {
        return {code: 1, result: error};
    }
}

// findAllAccounts()
// findAccount(_where ={status: 1}).then(r => console.log(r))
// findAccount(_where ={id: 452}).then(r => console.log(r))
// findAccount(_where = {address: '0x21366DB44c5C6Aebe8fE6005B3F599E561100740'}).then(r => console.log(r.result[0].toJSON()))
// updateAccounts(_params = {status: 1010}, _where = {id: 6290101},).then(r => console.log(r))
module.exports = {
    findAccount, updateAccount, createAccount
};

