const {exec} = require("../db/mysqlPool");

const exec_sql = (sql) => {
    return exec(sql)
        .then((rows) => {
            return {err: null, result: (rows[0] || null)}
        }).catch((error) => {
            console.trace(error)
            console.log("error", error.code)
            return {err: error.code, result: null}
        });
};

const exec_sql_all = (sql) => {
    return exec(sql).then((rows) => {
        return {err: null, result: (rows || [])}
    }).catch((error) => {
        console.trace(error)
        console.log("error", error)
        return {err: error.code, result: null}
    });
};
module.exports = {
    exec_sql,
    exec_sql_all,
};
