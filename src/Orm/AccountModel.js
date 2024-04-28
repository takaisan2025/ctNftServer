const {DataTypes} = require('sequelize')
// 将数据库连接对象导入
const sequelize = require('./MysqlConnection')

// 测试代码 导入对象成功
// console.log(sequelize);

// 创建模型
const AccountModel = sequelize.define('account', {

    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    // '主键',
    address: DataTypes.STRING,
    // '账户地址',
    keystore: DataTypes.STRING,
    // 'keystore',
    psd: DataTypes.STRING,
    // '密码',
    status: DataTypes.STRING,
    // '状态 1 默认状态, 2已经加入上链实名列表',
    private_key: DataTypes.STRING,
    // '私钥',
    create_time: DataTypes.DATE,
    // '创建时间',
    update_time: DataTypes.DATE,
    // '更新时间',
    remark: DataTypes.STRING,
    // '备注',

}, {
    //默认false修改表名为复数,true不修改表名，与数据库表名同步
    freezeTableName: true,
    timestamps: false,
});

// 导出模型
module.exports = AccountModel;

