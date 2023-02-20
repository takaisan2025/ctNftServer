const {get_mysql} = require("../db/genSql");
// SQL Parameters
var param = {
  category: "appl",
  id: 100,
};

// Get SQL Statement
var format = { language: "sql", indent: "" };
var sql = get_mysql("collect", "selectByPrimaryKey", param, format).result;

