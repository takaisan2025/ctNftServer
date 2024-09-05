"use strict";
const {findAccount} = require("../Orm/AccountService");
const {responseFunStr, responseFun} = require("../mapper/account");
const GlobalConfig = require("../config/GlobalConfig.json");
const {customHttpProvider} = require("../task/taskConst");
const EIP712 = require("../routers/EIP712");
const ABI_const = require("../contract/ABI_const");
const {createNftTransaction} = require("../Orm/NftTransactionService");
const {RESPONSE_STATUS} = require("../chain/responseError");
const ethers = require("ethers");
const {contract_static_call} = require("../contract/ChainCall");
const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const sigUtil = require("eth-sig-util");

async function find_account(_address) {
    //logic to find accounts
    try {

        let nfts_ret = await findAccount({address: _address})

        let account = null;
        if (nfts_ret.err === 0) {
            return {err: nfts_ret.err, result: null}
        } else {
            account = nfts_ret.result
        }

        return {err: null, result: account}
    } catch (e) {
        console.trace(e)
        console.log("error", e)
        return {err: e.code, result: null}
    }
}

async function auth_user_v1(randomWallet, s_address, expand_data) {

    let orderId = new Date().getTime() + "sys_a_auto";
    // 计算签名
    let orderIdEcc = `0x${ethUtil
        .keccak256(Buffer.from(orderId + ""))
        .toString("hex")}`;
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;

    // 判断接入方用户名密码
    let privateKeySys = GlobalConfig.AUTH_CONTROLLER_PK // TODO 这里需要系统地址
    let s_wallet = new ethers.Wallet(privateKeySys, customHttpProvider);

    // 判断商家身份
    let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
    //等待其它程序处理上链
    // 计算签名
    let privateKeyStr = randomWallet.privateKey;
    let verifyingContract = contractAddress;
    privateKeyStr = Web3.utils.stripHexPrefix(privateKeyStr);

    const privateKey = Buffer.from(privateKeyStr, "hex");

    // uint256 orderId,
    // address caddress,
    // address sender,
    // bool isAuth,
    // string expandData


    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
    //等待其它程序处理上链
    let sender = s_address;
    let authTime = 1766841499; // 没有用的参数
    let authExpiry = Math.round(new Date().getTime() / 1000) + 1 * 60 * 60 * 24 * 180; // 六个月
    let isAuth = true;
    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
    let expandData = expand_data;
    let caddress = randomWallet.address;
    // 计算签名
    let auth = {
        caddress,
        sender,
        authTime,
        authExpiry,
        isAuth,
        authLevel,
        expandData,
    };
    // let orderId = `0x${ethUtil
    //     .keccak256(Buffer.from(new Date().getTime() + ""))
    //     .toString("hex")}`;

    // uint256 orderId,
    // address caddress,
    // address sender,
    // bool isAuth,
    // string expandData

    const Types = {
        Authentication: [
            {type: "uint256", name: "orderId"},
            {type: "address", name: "caddress"},
            {type: "address", name: "sender"},
            {type: "bool", name: "isAuth"},
        ],
    };

    const data = EIP712.createTypeData(
        {
            name: "Authentication",
            version: "1",
            chainId: "27",
            verifyingContract,
        },
        "Authentication",
        {
            orderId: orderIdEcc,
            caddress: auth.caddress,
            sender: auth.sender,
            isAuth: auth.isAuth,
        },
        Types
    );

    let signature = sigUtil.signTypedData_v4(privateKey, {data: data});
    auth.signature = signature;

    let origin_data_json = [auth, orderIdEcc];
    // 存储上链数据
    let nft_transaction =
        {
            from: s_address,
            to: authContractAddress,
            status: 0,
            // "hash": "",
            // "block_number": "",
            type: 1,
            is_reback: 0,
            order_id: orderId,
            value: "0",
            "origin_data": JSON.stringify(origin_data_json),
            contract_address: authContractAddress,
            method:
                ABI_const["AuthController"].contractName + "#" + "authentication",
            origin_value: "0",
        };
    let nft_transaction_aql_result = await createNftTransaction(nft_transaction)

    if (nft_transaction_aql_result.err != null) {
        if (nft_transaction_aql_result.result == "order_id must be unique") {
            return responseFunStr(RESPONSE_STATUS.ERROR, "OrderId 冲突!", {});
        } else {
            return responseFunStr(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {});
        }
    }
    console.log(responseFunStr(RESPONSE_STATUS.SUCCESS, "请求成功", {
        s_address: s_wallet.address,
        address: address,
        orderId: orderId,
    }))

}

async function auth_user_v2(walletUser, card_id) {

    let orderId = new Date().getTime() + "sys_a_auto";
    // 计算签名
    let orderIdEcc = `0x${ethUtil
        .keccak256(Buffer.from(orderId + ""))
        .toString("hex")}`;

    // 判断接入方用户名密码
    let privateKeySys = GlobalConfig.AUTH_CONTROLLER_PK // TODO 这里需要系统地址
    let s_wallet = new ethers.Wallet(privateKeySys, customHttpProvider);

    // 判断商家身份
    let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
    //等待其它程序处理上链
    let authExpiry = Math.round(new Date().getTime() / 1000) + 1 * 60 * 60 * 24 * 3600; // 10 year
    let caddress = walletUser.address;
    // 计算签名
    let privateKeyStr = walletUser.privateKey;
    let verifyingContract = contractAddress;
    privateKeyStr = Web3.utils.stripHexPrefix(privateKeyStr);

    const privateKey = Buffer.from(privateKeyStr, "hex");

    // uint256 orderId,
    // address caddress,
    // address sender,
    // bool isAuth,
    // string expandData
    let idHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(card_id));
    idHash = idHash.slice(0, 34);
    // uint256 orderId,
    // address caddress,
    // address sender,
    // bool isAuth,
    // string expandData
    let auth = {
        authExpiry, idHash
    };
    const Types = {
        Authentication: [
            {type: "bytes16", name: "idHash"},
            {type: "uint256", name: "orderId"},
            {type: "address", name: "caddress"},],
    };

    const data = EIP712.createTypeData(
        {
            name: "Authentication",
            version: "2",
            chainId: "27",
            verifyingContract,
        },
        "Authentication",
        {
            idHash: idHash,
            orderId: orderId,
            caddress: caddress,
        },
        Types
    );

    let signature = sigUtil.signTypedData_v4(privateKey, {data: data});

    let origin_data_json = [auth, orderIdEcc, signature, caddress];

    // 存储上链数据
    // 插入数据库
    let nft_transaction = {
        from: s_wallet.address,
        to: contractAddress,
        status: 0,
        // "hash": "",
        // "block_number": "",
        type: 1,
        is_reback: 0,
        order_id: orderId,
        value: "0",
        origin_data: JSON.stringify(origin_data_json),
        contract_address: contractAddress,
        method:
            ABI_const["AuthControllerV2"].contractName +
            "#" +
            "authentication",
        origin_value: "0",
    }
    let nft_transaction_aql_result = await createNftTransaction(nft_transaction)

    if (nft_transaction_aql_result.err != null) {
        if (nft_transaction_aql_result.result === "order_id must be unique") {
            return responseFun(RESPONSE_STATUS.ERROR, "OrderId 冲突!", {});
        } else {
            return responseFun(RESPONSE_STATUS.ERROR, "操作失败,请重试!", {});
        }
    }
    return responseFun(RESPONSE_STATUS.SUCCESS, "请求成功", {
        s_address: s_wallet.address,
        address: address,
        orderId: orderId,
    })
}

async function auths_single(_address) {
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
    let isAuth = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthControllerV2"].abi,
        "authsSingle",
        customHttpProvider,
        [_address]
    );
    return isAuth
}

async function auths_idHash(_address) {
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS_V2;
    let isAuth = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthControllerV2"].abi,
        "address_idHash",
        customHttpProvider,
        [_address]
    );
    return isAuth
}

async function parentauths_v2(_address1, _address2) {
    // 判断商家身份
    let authContractAddress = GlobalConfig.AuthCall;
    let authData = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthCall"].abi,
        "parentauthsV2",
        customHttpProvider,
        [_address1, _address2]
    );
    return authData
}

module.exports = {
    find_account,
    auth_user_v1,
    auth_user_v2,
    parentauths_v2,
    auths_single,
    auths_idHash
}
