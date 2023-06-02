const {isEmpty} = require("../rules/rules");
const {
    nftUpdateSelectiveStatus,
    nftSelectSelectiveStatus,
    nftUpdateSelective,
} = require("../controller/ctnft");
const fs = require("fs");
const ipfsAPI = require("ipfs-api");
const GlobalConfig = require("../config/GlobalConfig.json");
const ipfsNode = ipfsAPI({
    host: GlobalConfig.IPFS[1].HOST,
    port: GlobalConfig.IPFS[1].PORT,
    protocol: GlobalConfig.IPFS[1].PROTOCOL,
});
const gasConfig = require("../config/gasConfig.json");
const FormData = require("form-data");
const Web3 = require("web3");
let web3 = new Web3("http://ctblock.cn/blockChain");
const path = require('path');
const crypto = require('crypto');
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const fetch = require("node-fetch");

let reCallUrlChanel1 = "http://nft.richonn.com/home/nft/casting";

const ABI_const = require("../contract/ABI_const.js");
const ethers = require("ethers");
const {contract_static_call} = require("../contract/ChainCall");
const {responseFunStr} = require("../mapper/account");
const {getPriKey} = require("../chain/accountProUtils");
const {PasswordError} = require("../chain/responseError");
const {exec_sql, exec_sql_all} = require("../controller/ctnft");
const {get_mysql} = require("../db/genSql");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider(
    {
        ...rpc,
    },
    {
        chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
    }
);

let minted721TokenStr = "execution reverted: ERC721: token already minted";
let minted1155TokenStr = "execution reverted: more than supply";
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
function Part(account, value) {
    return {
        account,
        value,
    };
}

function Mint721Data(tokenId, tokenURI, creators, royalties, signatures) {
    return {
        tokenId,
        tokenURI,
        creators,
        royalties,
        signatures,
    };
}

function Mint1155Data(
    tokenId,
    tokenURI,
    supply,
    creators,
    royalties,
    signatures
) {
    return {
        tokenId,
        tokenURI,
        supply,
        creators,
        royalties,
        signatures,
    };
}

let excloudAddr = ""

const ethUtil = require("ethereumjs-util");
const EIP712 = require("../router/EIP712");
const sigUtil = require("eth-sig-util");
const {RESPONSE_STATUS} = require("../chain/responseError");

async function authUser(walletUser) {

    let address = walletUser.address;
    let orderId = new Date().getTime() + "sys_a_auto";
    // 计算签名
    let orderIdEcc = `0x${ethUtil
        .keccak256(Buffer.from(orderId + ""))
        .toString("hex")}`;

    // 判断接入方用户名密码
    let privateKeySys = GlobalConfig.AUTH_CONTROLLER_PK // TODO 这里需要系统地址
    let s_wallet = new ethers.Wallet(privateKeySys, customHttpProvider);

    let c_wallet = walletUser;
    // 判断商家身份
    let contractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
    // TODO 这里新建一张表来存储上链信息 , 这里需要使用到签名
    //等待其它程序处理上链
    let sender = s_wallet.address;
    let authTime = 1766841499; // 没有用的参数
    let authExpiry = Date.now() + 1 * 60 * 60 * 24 * 180; // 六个月
    let isAuth = true;
    let authLevel = 2; // 机构下面用户认证使用2, 机构实名使用1
    let expandData = '{hash: \\"\\", version: \\"v1.0.0\\"}';
    console.log(expandData)
    let caddress = c_wallet.address;
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

    let privateKeyStr = c_wallet.privateKey;
    let verifyingContract = contractAddress;
    privateKeyStr = web3.utils.stripHexPrefix(privateKeyStr);

    const privateKey = Buffer.from(privateKeyStr, "hex");

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
    // 插入数据库
    let nft_transaction_aql = get_mysql(
        "NftTransactionMapper",
        "insertSelective",
        {
            from: s_wallet.address,
            to: contractAddress,
            status: 0,
            // "hash": "",
            // "block_number": "",
            type: 1,
            is_reback: 0,
            order_id: orderId,
            value: "0",
            // "origin_data": JSON.stringify(origin_data_json),
            origin_data: origin_data_json,
            contract_address: contractAddress,
            method:
                ABI_const["AuthController"].contractName +
                "#" +
                "authentication",
            origin_value: "0",
        }
    );
    let nft_transaction_aql_result = await exec_sql(
        nft_transaction_aql.result
    );
    if (nft_transaction_aql_result.err != null) {
        if (nft_transaction_aql_result.err == "ER_DUP_ENTRY") {
            return responseFunStr(500, "OrderId 冲突!", {});
        } else {
            return responseFunStr(500, "操作失败,请重试!", {});
        }
    }
    console.log(responseFunStr(RESPONSE_STATUS.SUCCESS, "请求成功", {
        s_address: s_wallet.address,
        address: address,
        orderId: orderId,
    }))

}


async function transfer(privateKey, value, toAddress, walletUser) {

    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    // if (GlobalConfig.CAN_AUTH) {
    let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
    let isAuth = await contract_static_call(
        ethers,
        authContractAddress,
        ABI_const["AuthController"].abi,
        "authsSingle",
        customHttpProvider,
        [walletUser.address]
    );
    if (isAuth.data != true) {
        // 这里进行预先实名
        await authUser(walletUser)
        console.log(responseFunStr(500, "用户信息未认证或过期,请稍后重试!", {}))
        return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
    }
    // }


    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        value: web3.utils.toHex(value),
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        // let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        // console.log("recept1:", recept1);
        // if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
        //     throw "Transaction Reverted";
        // }
        // if("INSUFFICIENT_FUNDS" == txRet.err.code) {
        //     await setString("BALANCE_" + contractAddressDetail.address, false, 300)
        //     // 跳出, 重新查询数据
        //     console.log("草田分余额不足:", contractAddressDetail.address)
        //     continue;
        // }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.trace("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

async function betchCallFund() {
    let nfts = nftSelectSelectiveStatus(7); // 上链成功  没有回调的
    let nftArr = await nfts
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.trace(responseFunStr(500, err, {}));
        });
    for (let retKey in nftArr) {
        try {
            let {tokenId, update_time, hash, rebackUrl} = nftArr[retKey];
            var formdata = new FormData();
            formdata.append("key", "qianyidata");
            // console.log(tokenId)
            formdata.append("tokenId", tokenId);
            formdata.append("mintDate", formatTime(update_time));
            formdata.append("status", "true");
            formdata.append("hash", hash);
            console.log("formatTime(update_time)", formatTime(update_time));
            var requestOptions = {
                method: "POST",
                body: formdata,
                redirect: "follow",
            };

            if (rebackUrl == "" || rebackUrl == null || rebackUrl == undefined || rebackUrl == reCallUrlChanel1) {
                let responseChanel1 = await fetch(reCallUrlChanel1, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        key: "qianyidata",
                        tokenId: tokenId,
                        mintDate: formatTime(update_time),
                        status: true,
                        hash: hash,
                    }),
                })
                    .then((response) => {
                        console.log("回调返回原始内容status:", response.status);
                        console.log("回调返回原始内容statusText:", response.statusText);
                        return response.json();
                    })
                    .then((response) => {
                        console.log("回调返回处理结果:", response);
                        return {data: response};
                    })
                    .catch((err) => {
                        console.trace("回调错误:", err, ",tokenId", tokenId);
                        return {data: null, err: err};
                    });
                //处理响应结果
                console.log(responseChanel1);
                if (responseChanel1.data == null) {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                } else if (responseChanel1.data.code == 200) {
                    await nftUpdateSelectiveStatus(1, tokenId); // 设置为回调成功状态
                } else {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                }
            } else {
                let responseRet = await fetch(rebackUrl, requestOptions)
                    .then((response) => {
                        console.log("回调返回原始内容status:", response.status);
                        console.log("回调返回原始内容statusText:", response.statusText);
                        return response.json();
                    })
                    .then((response) => {
                        console.log("回调返回处理结果:", response);
                        return {data: response};
                    })
                    .catch((err) => {
                        console.trace("回调错误:", err, ",tokenId", tokenId);
                        return {data: null, err: err};
                    });
                //处理响应结果
                let response = responseRet.data;
                console.log(response);
                if (response == null) {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                } else if (response.status && response.status == 1) {
                    await nftUpdateSelectiveStatus(1, tokenId); // 设置为回调成功状态
                } else {
                    await nftUpdateSelectiveStatus(9, tokenId);
                    continue;
                }
            }
        } catch (e) {
            console.trace(e);
            continue;
        }
    }
    console.log("betchCallFund All Done!");
    setTimeout(() => {
        formatTime(new Date());
        console.log("betchCallFund Start !!");
        betchCallFund();
    }, 2000);
}

function formatTime(date) {
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear();
    let month =
        date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
    let minute =
        date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
    let second =
        date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

betchCallFund();

// node src\task\mintReCallTask.js
