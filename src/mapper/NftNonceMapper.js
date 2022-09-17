const {exec, escape} = require("../db/mysqlPool");


const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/NftNonceMapper.xml"
]);

// Get SQL Statement
var format = {language: "sql", indent: "  "};

function queryNonce(address) {
    var sql = mybatisMapper.getStatement('NftNonceMapper', 'selectByAddress',
        {address: address}, format);
    return exec(sql).then((rows) => {
        return rows || [];
    });
}

async function insertNonce(address, nonce) {
    var sql = mybatisMapper.getStatement("NftNonceMapper", "insertSelective",
        {address: address, nonce: nonce}, format);
    return await exec(sql).then((rows) => {
        return rows || null;
    });
}

function updateNonce(address, nonce) {
    var sql = mybatisMapper.getStatement("NftNonceMapper", "updateByAddressSelective",
        {address: address, nonce: nonce}, format);
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
};
