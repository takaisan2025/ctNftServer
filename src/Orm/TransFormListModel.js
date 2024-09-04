"use strict";const {DataTypes} = require('sequelize')
// 将数据库连接对象导入
const sequelize = require('./MysqlConnection')

// 测试代码 导入对象成功
// console.log(sequelize);

// 创建模型
const TransFormListModel = sequelize.define('trans_form_list', {

    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    // '主键',
    t_from : DataTypes.STRING,
    // '发送方',
    t_to: DataTypes.STRING,
    // '接收方',
    amount: DataTypes.STRING,
    // '数量',
    reback_url: DataTypes.STRING,
    // '回调url',
    token_id: DataTypes.STRING,
    // 'tokenId',
    type: DataTypes.STRING,
    // '转账类型10 1155 12 owner1155',
    orderId: DataTypes.STRING,
    // '订单id',
    collectAddress: DataTypes.STRING,
    // '合约地址',
    t_status: DataTypes.STRING,
    // '状态, 1未操作,2成功3,失败 4 回调成功,5hash默认状态,6hash成功,7hash失败,8 回调失败',
    create_time: DataTypes.STRING,
    // '创建时间',
    update_time: DataTypes.STRING,
    // '最后更新时间',
    hash: DataTypes.STRING,
    // '转账hash',
    nonce: DataTypes.STRING,
    // '交易对应的nonce',

    vm_err: DataTypes.STRING, // '错误信息',
    remark: DataTypes.STRING, // '备注',
}, {
    //默认false修改表名为复数,true不修改表名，与数据库表名同步
    freezeTableName: true,
    timestamps: false,
});

// 导出模型
module.exports = TransFormListModel;

