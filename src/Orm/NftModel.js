const {DataTypes} = require('sequelize')
// 将数据库连接对象导入
const sequelize = require('./MysqlConnection')

// 测试代码 导入对象成功
// console.log(sequelize);

// 创建模型
const NftModel = sequelize.define('nft', {

    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    // '主键',
    collectAddress: DataTypes.STRING,
    // '收藏夹地址',
    address: DataTypes.STRING,
    // '创建者地址',
    premetadata: DataTypes.STRING,
    // '主要预元数据',
    imgPath: DataTypes.STRING,
    // '藏品图片路径',
    metaData: DataTypes.STRING,
    // '元数据地址\r\n',
    metaDataSource: DataTypes.STRING,
    // '元数据原文',
    isFinish: DataTypes.STRING,
    // '状态. 0 未上链 , 1上链成功, 2 上链失败',
    owner: DataTypes.STRING,
    // '持有者地址',
    rebackUrl: DataTypes.STRING,
    // '回调地址',
    creator: DataTypes.STRING,
    // '创建者地址',
    supply: DataTypes.STRING,
    // '数量',
    status: DataTypes.STRING,
    // '当前状态,0 初始状态,1已回调状态,2,上架,3.下架,4冻结,5永久下架,6.资源已上ipfs.未上链7 上链成功,8上链失败.9回调失败  10 hash产生状态 11 hash成功状态,12hash失败状态',
    create_time: DataTypes.STRING,
    // '创建时间',
    update_time: DataTypes.STRING,
    // '更新时间',
    remark: DataTypes.STRING,
    // '备注',
    hash: DataTypes.STRING,
    // '铸造hash',
    tokenIdDecmial: DataTypes.STRING,
    // 'tokenId十进制',
    tokenId: DataTypes.STRING,
    // 'tokenId',
    fileName: DataTypes.STRING,
    // '文件名',
    tempPath: DataTypes.STRING,
    // '临时路径',
    serverPath: DataTypes.STRING,
    // '转存路径',
    nonce: DataTypes.STRING,
    // '交易对应的nonce值',
    hash_status: DataTypes.STRING,
    // 'hash的状态默认0,1成功,2 失败',

}, {
    //默认false修改表名为复数,true不修改表名，与数据库表名同步
    freezeTableName: true,
    timestamps: false,
});

// 导出模型
module.exports = NftModel;

