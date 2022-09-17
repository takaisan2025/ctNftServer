/*
 Navicat Premium Data Transfer

 Source Server         : ctnft 业务数据库
 Source Server Type    : MySQL
 Source Server Version : 50734
 Source Host           : 47.98.187.17:3306
 Source Schema         : ctnft_nft

 Target Server Type    : MySQL
 Target Server Version : 50734
 File Encoding         : 65001

 Date: 15/08/2022 23:15:30
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for account
-- ----------------------------
DROP TABLE IF EXISTS `account`;
CREATE TABLE `account`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账户地址',
  `keystore` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'keystore',
  `psd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '密码',
  `status` int(255) NOT NULL COMMENT '状态',
  `private_key` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '私钥',
  `create_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新时间',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `address`(`address`) USING BTREE,
  INDEX `psd`(`psd`) USING BTREE,
  INDEX `status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 77606 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for collect
-- ----------------------------
DROP TABLE IF EXISTS `collect`;
CREATE TABLE `collect`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '合约地址',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `symbol` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '符号',
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '合约持有者',
  `contract_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '合约url',
  `token_url_prefix` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'tokenURL的前缀',
  `contract_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '合约名称',
  `type` int(10) NULL DEFAULT NULL COMMENT '0 erc721, \r\n1 erc1155, \r\n2 exchange, \r\n3 transproxy \r\n4.721proxy \r\n5.1155proxy\r\n6.lazy721proxy\r\n7.1155user\r\n8.721user\r\n9. layerc721\r\n10 layererc1155\r\n11 草田积分合约',
  `create_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建者地址',
  `create_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `collect_ibfk_1`(`create_address`) USING BTREE,
  INDEX `address`(`address`) USING BTREE,
  CONSTRAINT `collect_ibfk_1` FOREIGN KEY (`create_address`) REFERENCES `account` (`address`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB AUTO_INCREMENT = 59 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for nft
-- ----------------------------
DROP TABLE IF EXISTS `nft`;
CREATE TABLE `nft`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `collectAddress` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '收藏夹地址',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '创建者地址',
  `premetadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主要预元数据',
  `imgPath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '藏品图片路径',
  `metaData` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '元数据地址\r\n',
  `metaDataSource` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '元数据原文',
  `isFinish` int(255) NULL DEFAULT NULL COMMENT '状态. 0 未上链 , 1上链成功, 2 上链失败',
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '持有者地址',
  `rebackUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回调地址',
  `creator` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '创建者地址',
  `supply` int(1) UNSIGNED NULL DEFAULT NULL COMMENT '数量',
  `status` int(255) NOT NULL COMMENT '当前状态,0 初始状态,1已回调状态,2,上架,3.下架,4冻结,5永久下架,6.资源已上ipfs.未上链7 上链成功,8上链失败.9回调失败  10 hash产生状态 11 hash成功状态,12hash失败状态',
  `create_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新时间',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '铸造hash',
  `tokenIdDecmial` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'tokenId十进制',
  `tokenId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'tokenId',
  `fileName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文件名',
  `tempPath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '临时路径',
  `serverPath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '转存路径',
  `nonce` int(255) NULL DEFAULT NULL COMMENT '交易对应的nonce值',
  `hash_status` int(255) NULL DEFAULT NULL COMMENT 'hash的状态默认0,1成功,2 失败',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `tokenId`(`tokenId`) USING BTREE,
  INDEX `collect_address`(`collectAddress`) USING BTREE,
  INDEX `address`(`address`) USING BTREE,
  CONSTRAINT `nft_ibfk_1` FOREIGN KEY (`collectAddress`) REFERENCES `collect` (`address`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `nft_ibfk_2` FOREIGN KEY (`address`) REFERENCES `account` (`address`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB AUTO_INCREMENT = 1881 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for nft_contract_config
-- ----------------------------
DROP TABLE IF EXISTS `nft_contract_config`;
CREATE TABLE `nft_contract_config`  (
  `id` int(255) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `buyer_fee` decimal(10, 0) NULL DEFAULT NULL COMMENT '买家手续费',
  `seller_fee` decimal(10, 0) NULL DEFAULT NULL COMMENT '卖家手续费',
  `ipfs_url` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ipfs访问地址',
  `transfer_proxy` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '代理地址',
  `transfer_proxy_for_deprecated` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `erc20_transfer_proxy` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'erc20代理合约',
  `state` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '状态合约',
  `exchange_v1` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '交易合约',
  `orders_holder` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '持有者合约',
  `sing_sign_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'tokenId签名者',
  `beneficiary` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '平台手续费地址,只做展示',
  `buyer_fee_signer` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '手续费签名者',
  `create_time` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for nft_nonce
-- ----------------------------
DROP TABLE IF EXISTS `nft_nonce`;
CREATE TABLE `nft_nonce`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '交易hash',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '地址',
  `nonce` int(10) NOT NULL COMMENT 'nonce',
  `create_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '最后更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `address`(`address`) USING BTREE COMMENT '地址唯一索引'
) ENGINE = InnoDB AUTO_INCREMENT = 7140 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for nft_sign
-- ----------------------------
DROP TABLE IF EXISTS `nft_sign`;
CREATE TABLE `nft_sign`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contract_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '合约地址',
  `nonce` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'tokenid',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `contract_address`(`contract_address`) USING BTREE,
  INDEX `nonce`(`nonce`) USING BTREE,
  CONSTRAINT `nft_sign_ibfk_1` FOREIGN KEY (`contract_address`) REFERENCES `collect` (`address`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for nft_token_id
-- ----------------------------
DROP TABLE IF EXISTS `nft_token_id`;
CREATE TABLE `nft_token_id`  (
  `id` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '主键\r\n\r\n\r\n\r\n\r\ntoken + tokenid + owner + buyToken + buyTokenId +  salt + ',
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '收藏夹地址',
  `token_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'tokenId',
  `assetType` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `owner` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'tokenId持有者地址',
  `salt_value` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '随机数',
  `salt_type` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '随机数类型',
  `buy_value` int(10) NULL DEFAULT NULL COMMENT '购买金额',
  `buy_token` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '购买的收藏夹地址',
  `buy_token_id` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '购买的tokenId',
  `buy_asset_type` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '币种类型',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '销售的币种数量',
  `signature` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家 Fix price 签名值',
  `signature_v` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家 Fix price 签名值',
  `signature_s` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家 Fix price 签名值',
  `signature_r` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家 Fix price 签名值',
  `update_date` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  `important_update_date` datetime(0) NULL DEFAULT NULL,
  `update_state_date` datetime(0) NULL DEFAULT NULL,
  `contract_version` decimal(10, 0) NULL DEFAULT NULL,
  `fee` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖方指定的价格',
  `sold` decimal(10, 0) NULL DEFAULT NULL,
  `canceld` tinyint(255) NULL DEFAULT NULL COMMENT '1  挂单成功,2成交成功',
  `buy_price_eth` decimal(10, 0) NULL DEFAULT NULL,
  `version` decimal(10, 0) NULL DEFAULT NULL,
  `buy_price` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家手续费',
  `active` tinyint(10) NULL DEFAULT NULL,
  `buy_stock` decimal(10, 0) NULL DEFAULT NULL,
  `sell_price` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '卖家手续费',
  `create_time` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `token_id`(`token_id`) USING BTREE,
  INDEX `token`(`token`) USING BTREE,
  CONSTRAINT `nft_token_id_ibfk_1` FOREIGN KEY (`token`) REFERENCES `collect` (`address`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `nft_token_id_ibfk_2` FOREIGN KEY (`token_id`) REFERENCES `nft_sign` (`nonce`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for trans_form_list
-- ----------------------------
DROP TABLE IF EXISTS `trans_form_list`;
CREATE TABLE `trans_form_list`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `t_from` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '发送方',
  `t_to` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '接收方',
  `amount` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '数量',
  `reback_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回调url',
  `token_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'tokenId',
  `type` int(255) NOT NULL COMMENT '转账类型10 1155 12 owner1155',
  `orderId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '订单id',
  `collectAddress` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '合约地址',
  `t_status` int(255) NOT NULL COMMENT '状态, 1未操作,2成功3,失败 4 回调成功,5hash默认状态,6hash成功,7hash失败,8 回调失败',
  `create_time` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '最后更新时间',
  `hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '转账hash',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `orderId`(`orderId`) USING BTREE COMMENT '订单唯一hash'
) ENGINE = InnoDB AUTO_INCREMENT = 38268 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
