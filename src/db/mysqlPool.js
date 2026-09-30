var mysql = require("mysql");
const {MYSQL_CONFIG} = require("../config/db"); // 来自上面的配置文件
var pool = mysql.createPool(MYSQL_CONFIG);
var exec = function (sql) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, conn) {
            if (err) {
                reject(err);
                return;
            } else {
                conn.query(sql, function (err1, result, fields) {
                    //事件驱动回调
                    try {
                        if (err1) {
                            reject(err1);
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

var query = function (sql, options, callback) {

    pool.getConnection(function (err, conn) {
        if (err) {
            callback(err, null, null);
        } else {
            conn.query(sql, options, function (err, results, fields) {
                try {
                    callback(err, results, fields);
                } finally {
                    conn.release();
                }
            });
        }
    });
};

module.exports = {
    exec,
    escape: mysql.escape,
};
