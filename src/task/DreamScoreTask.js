const {
    nftUpdateSelectiveIsFinish,
    responseFun,
} = require("../controller/ctnft");
const {
    queryNonce,
    insertNonce,
    updateNonce
} = require("../mapper/NftNonceMapper");


const GlobalConfig = require("../config/GlobalConfig.json");
const {
    execSql,
    execSqlAll
} = require("../db/mysqlPoolPhp");
const web3 = require("web3");
let privateKeySys = GlobalConfig.SCORE_ACCOUNT.private_key; // score pri

const TRANSACTION_RECEIPT_STATUS = {
    SUCCESS: 1,
    REVERTED: 0,
};
const ScoreToken = require("../contract/ScoreToken.json");
const ethers = require("ethers");
const {getMysqlSqlByTabNameAndSqlNameAndParam} = require("../db/genSql");
// 通过定制 URL 连接 :
let rpc = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];

let customHttpProvider = new ethers.providers.JsonRpcProvider({
    ...rpc
}, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

let typeMapper = {
    1: "每天登录",
    2: "拉新用户",
    3: "购买藏品"

}
let gasPrice = "5000100000000";
let isGasPrice = false;

async function betchGive() {
    var params = {status: 0};
    var sql = getMysqlSqlByTabNameAndSqlNameAndParam(
        "AppJifenRecordHistoryMapper",
        "selectByStatus",
        params

    ).result;
    let transList = await execSqlAll(sql)
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
        if (!isGasPrice) {
            gasPrice = (await customHttpProvider.getGasPrice()).toString();
            isGasPrice = true;
        }
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
        console.log("gasPrice*:", gasPrice * gasLimit);
        //这里通过数据库查询来获取nonce
        var nonceResult = await queryNonce(wallet.address);
        let transactionCount1Mint;
        let currTime = new Date().getTime();
        if (nonceResult.length == 0) {
            transactionCount1Mint =
                await customHttpProvider.getTransactionCount(wallet.address, "latest");
            await insertNonce(wallet.address, transactionCount1Mint);
        } else if (currTime - nonceResult[0].update_time.getTime() > 60000) {   // 超过1min自动重新获取
            // 超时,重新获取nonce
            console.log("超时,重新获取nonce.....................");
            transactionCount1Mint =
                await customHttpProvider.getTransactionCount(wallet.address, "latest");
            await updateNonce(wallet.address, transactionCount1Mint);
        } else {
            transactionCount1Mint = nonceResult[0].nonce;
        }

        let overrides = {
            // The maximum units of gas for the transaction to use
            gasLimit: web3.utils.numberToHex(gasLimit),
            // The price (in wei) per unit of gas
            gasPrice: web3.utils.numberToHex(gasPrice),
            // The nonce to use in the transaction
            // nonce: nonce,
            nonce: transactionCount1Mint,
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
        var sqlUp = getMysqlSqlByTabNameAndSqlNameAndParam(
            "AppJifenRecordHistoryMapper",
            "updateByPrimaryKeySelective",
            paramsUp

        ).result;
        let result = await execSql(sqlUp)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.error(responseFun(500, err, ""), id);
            });
        console.log("update TransFrom data:", result);
        await updateNonce(wallet.address, transactionCount1Mint + 1);
    }
    console.log("betchGive All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchGive Start !!")
        betchGive();
    }, 2000);
}

async function betchHashQuery() {

    var params = {status: 1};
    var sql = getMysqlSqlByTabNameAndSqlNameAndParam(
        "AppJifenRecordHistoryMapper",
        "selectByStatus",
        params

    ).result;
    let transList = await execSqlAll(sql)
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
        var sqlUp = getMysqlSqlByTabNameAndSqlNameAndParam(
            "AppJifenRecordHistoryMapper",
            "updateByPrimaryKeySelective",
            paramsUp

        ).result;
        let result = await execSql(sqlUp)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.error(responseFun(500, err, ""), id);
            });
    }
    console.log("betchHashQuery All Done!");
    setTimeout(() => {
        formatTime(new Date())
        console.log("betchHashQuery Start !!")
        betchHashQuery();
    }, 2000);
}

function formatTime(date) {
    console.log("formatTime", date)
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`

}

betchGive();
betchHashQuery()
// node src/task/DreamScoreTask.js
