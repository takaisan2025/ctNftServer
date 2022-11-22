const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/collect.xml",
    "src/mapper/xml/nft.xml",
    "src/mapper/xml/TransFormListMapper.xml",
    "src/mapper/xml/TransFormListMapper.xml",
    "src/mapper/xml/NftUserAccesListMapper.xml",
    "src/mapper/xml/NftUserAddressListMapper.xml",
    "src/mapper/xml/AccountMapper.xml",
    "src/mapper/xml/NftChargeListMapper.xml",
]);
var format = {language: "mysql", indent: " ", linesBetweenQueries: 1, uppercase: true};
let getMysqlSqlByTabNameAndSqlNameAndParam = function (tabName, sqlName, params) {

    // 这里接入redis


    try {
        var sql = mybatisMapper.getStatement(
            tabName,
            sqlName,
            params,
            format
        );
        return {err: null, result: sql}
    } catch (e) {
        console.trace(e)
        return {err: e, result: null}
    }

}
module.exports =
    {
        getMysqlSqlByTabNameAndSqlNameAndParam
    };
