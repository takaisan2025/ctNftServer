const {exec, escape} = require("../db/mysqlPool");

const {get_mysql} = require("../db/genSql");

function queryNonce(address) {
    var sql = get_mysql('NftNonceMapper', 'selectByAddress',
        {address: address}).result;
    return exec(sql).then((rows) => {
        return rows || [];
    });
}

async function insertNonce(address, nonce) {
    var sql = get_mysql("NftNonceMapper", "insertSelective",
        {address: address, nonce: nonce}).result;
    return await exec(sql).then((rows) => {
        return rows || null;
    });
}

function updateNonce(address, nonce) {
    var sql = get_mysql("NftNonceMapper", "updateByAddressSelective",
        {address: address, nonce: nonce}).result;
    return exec(sql).then((rows) => {
        return rows || null;
    });
}

function delNonce(address) {
    var sql = get_mysql("NftNonceMapper", "deleteByAddress",
        {address: address}).result;
    return exec(sql).then((rows) => {
        return rows || null;
    });
}

async function main() {
    // let reesult = await insertNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E52", 0);
    // let reesult = await updateNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D", 1);
    let reesult = await queryNonce("0xcEBcbF16494EDbAd87d7FEAb0260ADe82c571E5D");
    console.log((reesult[0].update_time.getTime()));
    console.log((new Date().getTime()));
}

// main();

module.exports = {
    queryNonce,
    insertNonce,
    updateNonce,
    delNonce,
};
