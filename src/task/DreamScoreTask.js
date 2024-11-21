
const GlobalConfig = require("../config/GlobalConfig.json");
const {
    exec_sql,
    exec_sql_all
} = require("../db/mysqlPoolPhp");
const Web3 = require("web3");
let privateKeySys = GlobalConfig.SCORE_ACCOUNT.private_key; // score pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ScoreToken = require("../contract/ScoreToken.json");
const ethers = require("ethers");
const {responseFun} = require("../mapper/account");
const {get_mysql} = require("../db/genSql");
const {customHttpProvider} = require("./taskConst");
const {getString, setString} = require("../redis/redis-client");
let typeMapper = {
    1: "每天登录",
    2: "拉新用户",
    3: "购买藏品"

}

// 获取账户的 nonce
async function getNonce(address) {
    let nonce = await getString(address + '_NONCE');
    if (Number(nonce) > 0) {
        nonce = Number(nonce) + 1;
        await setString(address + '_NONCE', nonce, 4)  // 5s

    } else {
        nonce = await customHttpProvider.getTransactionCount(address, "latest");
        console.log(address + "Nonce:", nonce);
        await setString(address + '_NONCE', nonce, 4)  // 5s
    }

    return nonce;
}

async function betchGive() {
    var params = {status: 0};
    var sql = get_mysql(
        "AppJifenRecordHistoryMapper",
        "selectByStatus",
        params
    ).result;
    let transList = await exec_sql_all(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    console.log(transList);
    for (let retKey in transList) {
        const {
            id, tel, type, amount, status, create_time, update_time, wallet_address, hash,
            contract_address, remark, user_id
        } = transList[retKey];

        // address: wallet.address,
        // privateKey: wallet.privateKey,
        let wallet = new ethers.Wallet(privateKeySys, customHttpProvider);

        // 使用Provider 连接合约，将只有对合约的可读权限
        let contract = new ethers.Contract(
            contract_address,
            ScoreToken.abi,
            customHttpProvider
        );

        // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
        let contractWithSigner = contract.connect(wallet);
        //safeTransferFrom(from, to, data.tokenId, transfer, "");
        let gasLimit = await contractWithSigner.estimateGas
            .mint(
                type,
                wallet_address,
                typeMapper[type]
            )
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("err:", err);
                return "";
            });
        console.log("gasLimit:", gasLimit.toString());
        //这里通过数据库查询来获取nonce
        var nonceResult = await getNonce(wallet.address);

        let overrides = {
            // The maximum units of gas for the transaction to use
            // gasLimit: Web3.utils.numberToHex(gasLimit),
            // The price (in wei) per unit of gas
            maxFeePerGas: Web3.utils.numberToHex(4800e9),
            maxPriorityFeePerGas: Web3.utils.numberToHex(4500e9),
            // The nonce to use in the transaction
            // nonce: nonce,
            nonce: nonceResult,
            // The amount to send with the transaction (i.e. msg.value)
            // value: utils.parseEther('1.0'),
            // The chain ID (or network ID) to use
            // chainId: 27
        };
        // 设置一个新值，返回交易
        let tx = await contractWithSigner
            .mint(
                type,
                wallet_address,
                typeMapper[type],
                overrides
            )
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.log("err:", err);
                return err;
            });
        // console.log("tx:", tx.toString().startsWith('0x'))
        // console.log("tx:", tx);

        console.log("hash:", tx.hash);
        // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
        // save db
        let trans_from_obj = {
            hash: tx.hash,
            status: 1, // 上链成功
            id: id
        };
        console.log("nftUpdateSelective:", trans_from_obj);

        var paramsUp = trans_from_obj;
        var sqlUp = get_mysql(
            "AppJifenRecordHistoryMapper",
            "updateByPrimaryKeySelective",
            paramsUp
        ).result;
        let result = await exec_sql(sqlUp)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.error(responseFun(RESPONSE_STATUS.ERROR, err, ""), id);
            });
        console.log("update TransFrom data:", result);
    }
    console.log("betchGive All Done!");
    setTimeout(() => {
        console.log("betchGive Start !!")
        betchGive();
    }, 2000);
}

async function betchHashQuery() {

    var params = {status: 1};
    var sql = get_mysql(
        "AppJifenRecordHistoryMapper",
        "selectByStatus",
        params
    ).result;
    let transList = await exec_sql_all(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.log("ERR:", err);
            return err;
        });

    for (let retKey in transList) {
        console.log(transList[retKey]);
        const {
            id,
            hash
        } = transList[retKey];
        let recept = await customHttpProvider.getTransactionReceipt(hash);
        console.log(recept);


        // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
        // save db
        let t_statusStorage;
        if (recept == null) {
            // t_statusStorage = 4;
            continue;
        } else if (recept.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
            console.log("Transaction Reverted");
            t_statusStorage = 3;
        } else {
            t_statusStorage = 2;
        }
        let trans_from_obj = {
            status: t_statusStorage, // 6 成功,7 失败
            id: id
        };
        console.log("nftUpdateSelective:", trans_from_obj);

        var paramsUp = trans_from_obj;
        var sqlUp = get_mysql(
            "AppJifenRecordHistoryMapper",
            "updateByPrimaryKeySelective",
            paramsUp
        ).result;
        let result = await exec_sql(sqlUp)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.error(responseFun(RESPONSE_STATUS.ERROR, err, ""), id);
            });
    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        console.log("betchHashQuery Start !!")
        betchHashQuery();
    }, 2000);
}

betchGive();
betchHashQuery()
// node src/task/DreamScoreTask.js
