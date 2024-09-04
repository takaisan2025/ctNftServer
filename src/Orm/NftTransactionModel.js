"use strict";const {DataTypes} = require('sequelize')
// 将数据库连接对象导入
const sequelize = require('./MysqlConnection')

// 测试代码 导入对象成功
// console.log(sequelize);

// 创建模型
const NftTransactionModel = sequelize.define('nft_transaction', {

    id: {
        type: DataTypes.STRING,
        primaryKey: true
    }
    ,
// '主键',
    from: DataTypes.STRING,
// '交易sender',
    to: DataTypes.STRING,
// '交互对象',
    data: DataTypes.STRING,
// '合约交互数据',
    status: DataTypes.STRING,
// '状态 0 未操作,1上链产生hash,2上链失败,3上链成功',
    hash: DataTypes.STRING,
// '交易hash',
    block_number: DataTypes.STRING,
// '交易确认区块号',
    type: DataTypes.STRING,
// '类型,1认证,2铸造 3创建合约4 721nft交易5 1155nft交易',
    reback_url: DataTypes.STRING,
// '回调地址',
    is_reback: DataTypes.STRING,
// '是否回调,0不回掉,1 回调',
    order_id: DataTypes.STRING,
// '订单号',
    vm_err: DataTypes.STRING,
// '合约交互错误信息',
    value: DataTypes.STRING,
// '转账金额',
    origin_data: DataTypes.STRING,
// '原始合约交互数据',
    contract_address: DataTypes.STRING,
// '交互的合约地址',
    method: DataTypes.STRING,
// '合约abi名称#方法名',
    origin_value: DataTypes.STRING,
// '原始value , 备用字段',
    remark: DataTypes.STRING,
// '备注',
    create_time: DataTypes.DATE,
// '创建时间',
    update_time: DataTypes.DATE,
// 更新时间

}, {
    //默认false修改表名为复数,true不修改表名，与数据库表名同步
    freezeTableName: true,
    timestamps: false,
});

// 导出模型
module.exports = NftTransactionModel;

