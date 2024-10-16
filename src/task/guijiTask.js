const {
    isEmpty
} = require("../rules/rules");
const GlobalConfig = require("../config/GlobalConfig.json");
const Web3 = require("web3");
const {
    getString,
    setString,
    removeString, getKeys, lpop,
} = require("../redis/redis-client");
const fs = require('fs');
const path = require('path');
const {Sequelize, Model, DataTypes} = require('sequelize');
// 文件路径
const filePath = path.join(__dirname, 'guiji.json');

const ERC1155Ctnft = require("../contract/ERC1155Ctnft.json");
const CtTransferExecutor = require("../contract/CtTransferExecutor.json");
let CtTransferExecutorAddress = GlobalConfig.CtTransferExecutorAddress;
const ethers = require("ethers");

const ethUtil = require("ethereumjs-util");
const {responseFunStr} = require("../mapper/account");
const {responseFun} = require("../mapper/account");
const {PasswordError} = require("../chain/responseError");
const {getPriKey} = require("../chain/accountProUtils");

const betchTransferFlag = "guiji_Start";

const {id_fun} = require("./taskConst");
const {customHttpProvider} = require("./taskConst");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {findTransFormListAll, updateTransFormList} = require("../Orm/TransFormListService");
const {Op} = require('sequelize')
const {findAccount} = require("../Orm/AccountService");
const {findCollect} = require("../Orm/CollectService");
const {auth_user_v1, auth_user_v2, auths_single, auths_idHash} = require("../services/accountService");
const {queryBalance} = require("../chain/balanceQuery");

// 创建一个Provider（你可以连接到一个特定的以太坊节点，或使用默认的Infura/Alchemy等）

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

async function guijiTask() {
    if (await getString(betchTransferFlag) == "1") {
        console.log('===================wait start guiji Task')
        return
    } else {
        await setString(betchTransferFlag, "1", 90)

        console.time("guijiTask")

        let newVar = await getKeys("BALANCE_*");

        let andfrom = [];
        for (let newVarElement of newVar) {
            let stringAddress = newVarElement.split('BALANCE_')[1];
            andfrom.push(stringAddress)
        }

        // 读取 JSON 文件 (同步)
        const data = fs.readFileSync(filePath, 'utf-8');

        // 将 JSON 字符串解析为对象
        let jsonData = JSON.parse(data);

        let transList_ret = await findTransFormListAll(_param = {
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('t_from')), 't_from'],
                "id"
            ],
            where: {
                t_status: 4,
                id: {
                    [Op.gte]: jsonData.num
                },
                t_from: {
                    [Op.ne]: "0x637d71e819058a36b423dd1Ab67Fe66CeA9a4B6E"
                },
                collectAddress: "0x8061FA9Ab8E82A6d0BEFfFca23eB3e1D85672d73"
            },
            offset: 0,
            limit: 500,
        })

        // console.log("betchTransferThread", sql)
        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.result);
        }
        transList = transList_ret.result;
        for (let retKey in transList) {
            const {
                id,
                t_from,
                amount,
                reback_url,
                token_id,
                type,
                orderId,
                collectAddress,
                t_status,
                create_time,
                update_time
            } = transList[retKey];
            try {

                // TODO 待完成
                // await lpop("TRANSFER_F")

                let accountDetail_ret01 = await findAccount({address: t_from})
                let accountDetail = accountDetail_ret01.result

                let accountItem = accountDetail;
                // try {
                let wallet;

                // 链上余额判断
                let etherString = await queryBalance(t_from);
                console.log("To Address:", t_from)
                console.log("Balance:", etherString)
                if (Number(etherString) > Number(String(0.101))) {
                    let decWalletResult = await getPriKey(accountItem, accountItem.psd);
                    if (decWalletResult.err != null) {
                        return PasswordError;
                    } else {
                        wallet = decWalletResult.result;
                    }
                    wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

                    let {
                        err,
                        hash
                    } = await transfer(wallet.privateKey, ethers.utils.parseEther(String(Number(etherString) - 0.101)), "0x637d71e819058a36b423dd1Ab67Fe66CeA9a4B6E", wallet);
                    if (err != null) {
                        console.log("txTransfer faild");
                        continue;
                    }
                    console.log("tx Hash:", hash);
                }
                // 修改 JSON 对象的值
            } catch (e) {
                console.error(e)
                console.trace(e)
            }
            console.log("修改 JSON 对象的值", id);
            jsonData.num = id; // 例如修改 `name` 字段

            // 将修改后的对象转换为 JSON 字符串
            const updatedJsonData = JSON.stringify(jsonData, null, 2); // 格式化输出

            // 写入修改后的 JSON 文件 (同步)
            fs.writeFileSync(filePath, updatedJsonData, 'utf-8');
        }

        await guijiTask()
    }
}

async function transfer(privateKey, value, toAddress, walletUser) {

    // 这里首先判断toAddress的实名情况, 否则转手续费会失败
    // if (GlobalConfig.CAN_AUTH) {
    let walletSys = new ethers.Wallet(privateKey, customHttpProvider);
    let isAuth = await auths_single(walletUser.address);
    if (isAuth.data != true) {
        // 这里进行预先实名
        let idHash = await auths_idHash(walletUser.address)
        if (idHash.data === '0x00000000000000000000000000000000') {
            console.log(responseFunStr(RESPONSE_STATUS.ERROR, "用户信息未认证或过期,请稍后重试!", {}))

            let _account_to = await findAccount({address: toAddress});
            let _to_wallet = await getPriKey(_account_to.result, _account_to.result.psd);
            let _towallet = new ethers.Wallet(_to_wallet.result.privateKey, customHttpProvider);
            let _s_walletSys = new ethers.Wallet(GlobalConfig.AUTH_CONTROLLER_PK, customHttpProvider);
            await auth_user_v1(_towallet, _s_walletSys.address, "{auto _ auth}")
            // return {err: "用户信息未认证或过期,请稍后重试!", hash: null};
        } else {
            await auth_user_v2(walletUser, idHash, walletSys.address)
        }
    }
    // }


    let nonce = await getNonce(walletSys.address)
    let tx = {
        to: toAddress,
        // ... or supports ENS names
        // to: "ricmoo.firefly.eth"
        // We must pass in the amount as wei (1 ether = 1e18 wei), so we
        // use this convenience function to convert ether to wei.
        nonce: nonce,
        gasPrice: Web3.utils.numberToHex(4800e9),
        value: Web3.utils.toHex(value),
    };

    let txTransfer = await walletSys.sendTransaction(tx);
    console.log("txTransfer: :", txTransfer.hash);
    try {
        // let recept1 = await customHttpProvider.waitForTransaction(txTransfer.hash);
        // console.log("recept1:", recept1);
        // if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
        //     throw "Transaction Reverted";
        // }
        return {err: null, hash: txTransfer.hash};
    } catch (err) {
        console.trace("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
        return {err, hash: null};
    }
}

// setInterval(guijiTask, 20000)
module.exports = {
    guijiTask
};
