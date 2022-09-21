const mybatisMapper = require("mybatis-mapper");
// mybatisMapper.createMapper(["./xml/nft.xml"]);
mybatisMapper.createMapper([
  "./xml/collect.xml",
  "./xml/nft.xml",
  "./xml/TransFormListMapper.xml"
]);
// SQL Parameters
var param = {
  collectaddress: "appl",
  address: "2",
};

// Get SQL Statement
var format = { language: "sql", indent: "  " };
var sql = mybatisMapper.getStatement("nft", "insertSelective", param, format);
// var sql1 = mybatisMapper.getStatement('nft', 'selectByPrimaryKey', {id:10}, format);
// var sql2 = mybatisMapper.getStatement('nft', 'updateByPrimaryKeySelective', {id:10}, format);


// console.log(sql1)
// console.log(sql2)
