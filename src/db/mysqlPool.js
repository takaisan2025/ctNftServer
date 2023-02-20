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
                    if (err1) {
                        reject(err1);
                        return;
                    }
                    resolve(result);
                });
                //释放连接，需要注意的是连接释放需要在此处释放，而不是在查询回调里面释放
                conn.release();
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
                //事件驱动回调
                callback(err, results, fields);
            });
            //释放连接，需要注意的是连接释放需要在此处释放，而不是在查询回调里面释放
            conn.release();
        }
    });
};

module.exports = {
    exec,
    escape: mysql.escape,
};
