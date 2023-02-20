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
    "src/mapper/xml/NftTransactionMapper.xml",
]);
var format = {language: "mysql", indent: " ", linesBetweenQueries: 1, uppercase: true};
let get_mysql = function (tabName, sqlName, params) {
    // get_mysql
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
        get_mysql
    };
