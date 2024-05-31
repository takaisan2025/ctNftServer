const {DataTypes} = require('sequelize')
// 将数据库连接对象导入
const sequelize = require('./MysqlConnection')

// 测试代码 导入对象成功
// console.log(sequelize);

// 创建模型
const CollectModel = sequelize.define('collect', {

    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    // '主键',
    address: DataTypes.STRING,
    // 合约地址',
    name: DataTypes.STRING,
    // '标题',
    symbol: DataTypes.STRING,
    // '符号',
    owner: DataTypes.STRING,
    // '合约持有者',
    contract_url: DataTypes.STRING,
    // '合约url',
    token_url_prefix: DataTypes.STRING,
    // 'tokenURL的前缀',
    contract_name: DataTypes.STRING,
    // '合约名称',
    type: DataTypes.STRING,
    // '0 erc721, \r\n1 erc1155, \r\n2 exchange, \r\n3 transproxy \r\n4.721proxy \r\n5.1155proxy\r\n6.lazy721proxy\r\n7.1155user\r\n8.721user\r\n9. layerc721\r\n10 layererc1155\r\n11 草田积分合约',
    create_address: DataTypes.STRING,
    // '创建者地址',
    create_time: DataTypes.STRING,
    // '创建时间',
    update_time: DataTypes.STRING,
    // '更新时间',
    remark: DataTypes.STRING,
    // '备注',

}, {
    //默认false修改表名为复数,true不修改表名，与数据库表名同步
    freezeTableName: true,
    timestamps: false,
});

// 导出模型
module.exports = CollectModel;

