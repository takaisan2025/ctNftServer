const Sequelize = require('sequelize')


function pro_err(error) {

// 获取特定的错误信息
    if (error instanceof Sequelize.ValidationError) {
        // 处理验证错误
        // console.error('Validation Error:', error.errors);
         error.errors.forEach(err => {
            // console.error(`Field: ${err.path}, Message: ${err.message}, Code: ${err.type}`);
        });
        return error.errors[0].message
    } else if (error instanceof Sequelize.DatabaseError) {
        // 处理数据库错误
        // console.error('Database Error:', error.message);
        // console.error('Database Error Code:', error.parent.code);  // 数据库特定的错误代码
        return error.parent.code
    } else {
        // 处理其他类型的错误
        // console.error('Unexpected Error:', error.message);
        return error.message
    }
}

module.exports = {
    pro_err
};
