const {getMysqlSqlByTabNameAndSqlNameAndParam} = require("../db/genSql");

// SQL Parameters
var param = {
  collectaddress: "appl",
  address: "2",
};

// Get SQL Statement
var format = { language: "sql", indent: "  " };
var sql = getMysqlSqlByTabNameAndSqlNameAndParam("nft", "insertSelective", param, format).result;
// var sql1 = getMysqlSqlByTabNameAndSqlNameAndParam('nft', 'selectByPrimaryKey', {id:10}, format).result;
// var sql2 = getMysqlSqlByTabNameAndSqlNameAndParam('nft', 'updateByPrimaryKeySelective', {id:10}, format).result;


console.log(sql)
// console.log(sql2)
// node src/mapper/nft.js
