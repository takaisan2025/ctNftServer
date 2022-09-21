const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper(["./xml/collect.xml"]);
// SQL Parameters
var param = {
  category: "appl",
  id: 100,
};

// Get SQL Statement
var format = { language: "sql", indent: "" };
var sql = mybatisMapper.getStatement("collect", "selectByPrimaryKey", param, format);

