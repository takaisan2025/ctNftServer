var mysql = require("mysql");
const {MYSQL_CONFIG_PHP} = require("../config/dbPhp"); // 来自上面的配置文件
var pool = mysql.createPool(MYSQL_CONFIG_PHP);
var exec = function (sql) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, conn) {
            if (err) {
                reject(err);
                return;
            } else {
                conn.query(sql, function (err, result, fields) {
                    //事件驱动回调
                    try {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    } finally {
                        conn.release();
                    }
                });
            }
        });
    });

};

const exec_sql = (sql) => {
    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};

const exec_sql_all = (sql) => {
    return exec(sql).then((rows) => {
        return rows || [];
    });
};

module.exports = {
    exec,
    exec_sql_all,
    escape: mysql.escape,
    exec_sql
};
