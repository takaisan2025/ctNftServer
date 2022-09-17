const mybatisMapper = require("mybatis-mapper");
mybatisMapper.createMapper([
    "src/mapper/xml/AppJifenRecordHistoryMapper.xml",
    "src/mapper/xml/AppUserMapper.xml"
]);
const {
    writeFile,
    readFile
} = require("../file/fileWriteReadUtils");

const {
    execSql,
    execSqlAll
} = require("../db/mysqlPoolPhp");
const GlobalConfig = require("../config/GlobalConfig.json");
const scoreTokenAddress = GlobalConfig.SCORE_ADDRESS;
const ethers = require("ethers");
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let blockNumberCreate = 1090551;   // 合约的创建区块号
let blockNumberCurr = 0;   // 当前最新区块号
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
    chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

let startBlockNumber = 0;

function setBlockNumber() {

    customHttpProvider.on('block', async (blockNumberT) => {
        console.log("blockNumberT:", blockNumberT)
        let blockTxt = readFile("DreamScoreHistory.json");
        let wrBlock = JSON.parse(blockTxt).blockNumber;
        if (wrBlock < blockNumberT && startBlockNumber == 0) {
            startBlockNumber = blockNumberT;
            await fixBeforeEvent();
        }
        if (blockNumberT - blockNumberCurr > 12) { // 一分钟判断一次
            console.log("blockNumber", blockNumberT);
            let result = await getNftHistory(blockNumberCurr, blockNumberT);
            console.log("blockNumberT Result:", result);
            await processResult(result);
            blockNumberCurr = blockNumberT;
            writeFile("DreamScoreHistory.json", {"blockNumber": blockNumberT});
        }

    });
}

async function fixBeforeEvent() {
    let blockTxt = readFile("DreamScoreHistory.json");
    let wrBlock = JSON.parse(blockTxt).blockNumber;
    if (Number(wrBlock) == 0) {
        writeFile("DreamScoreHistory.json", {"blockNumber": blockNumberCreate});
        blockTxt = readFile("DreamScoreHistory.json");
        wrBlock = JSON.parse(blockTxt).blockNumber;
    }
    if (wrBlock < startBlockNumber) {

        //逻辑处理
        let result = await getNftHistory(wrBlock, startBlockNumber);
        console.log("fixBeforeEvent Result:", result);
        await processResult(result);

    }
}

async function getNftHistory(fromBlock, toBlock) {
    let topic = ethers.utils.id(
        "Transfer(address,address,uint256)"
    );

    //计算起始区块
    let filter = {
        address: scoreTokenAddress,
        fromBlock: fromBlock,    // 1天的数据
        toBlock: toBlock,
        topics: [topic],
    };
    return await customHttpProvider.getLogs(filter).then((result) => {
        return result;
    });
}

async function processResult(result) {
    var format = {language: "sql", indent: "  "};
    for (let resultKey in result) {
        let tempObj = result[resultKey];
        if (!tempObj.removed) {  // 非失败交易
            let value = ethers.utils.defaultAbiCoder.decode([
                "uint256"], tempObj.data).toString();
            let from = ethers.utils.defaultAbiCoder.decode([
                "address"], tempObj.topics[1])[0];
            let to = ethers.utils.defaultAbiCoder.decode([
                "address"], tempObj.topics[2])[0];
            let blockNumber = tempObj.blockNumber;
            let transactionHash = tempObj.transactionHash;

            if (from.toString().toLowerCase() != scoreTokenAddress && from.toString().toLowerCase() != to.toString().toLowerCase()) {  // 转增交易, 存入数据库
                console.log(from, to, value, blockNumber, transactionHash);
                /* 插入数据库*/
                let resultFrom = await execSql(mybatisMapper.getStatement(
                    "AppUserMapper",
                    "selectByAddress",
                    {
                        address: from
                    },
                    format
                ))
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                let resultTo = await execSql(mybatisMapper.getStatement(
                    "AppUserMapper",
                    "selectByAddress",
                    {
                        address: to
                    },
                    format
                ))
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(err);
                    });

                // 双向数据插入
                let resultExistFrom = await execSql(mybatisMapper.getStatement(
                    "AppJifenRecordHistoryMapper",
                    "selectByAddressAndHash",
                    {
                        wallet_address: from,
                        hash: transactionHash
                    },
                    format
                ))
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                console.log("resultExistFrom == null:", resultExistFrom == null)
                if (resultExistFrom == null) {
                    //    isfrom
                    var sqlFrom = mybatisMapper.getStatement(
                        "AppJifenRecordHistoryMapper",
                        "insert",
                        {
                            tel: resultFrom == null ? "" : resultFrom.tel,
                            type: "0",
                            amount: "-" + value,
                            status: "2",
                            wallet_address: from,
                            hash: transactionHash,
                            contract_address: scoreTokenAddress,
                            remark: "",
                            user_id: resultFrom == null ? "" : resultFrom.id
                        },
                        format
                    );
                    await execSql(sqlFrom)
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });

                }
                let resultExistTo = await execSql(mybatisMapper.getStatement(
                    "AppJifenRecordHistoryMapper",
                    "selectByAddressAndHash",
                    {
                        wallet_address: to,
                        hash: transactionHash
                    },
                    format
                ))
                    .then((ret) => {
                        return ret;
                    })
                    .catch((err) => {
                        console.error(err, id);
                    });
                console.log("resultExistTo:", resultExistTo == null)

                if (resultExistTo == null) {
                    //    !isfrom
                    var sqlTo = mybatisMapper.getStatement(
                        "AppJifenRecordHistoryMapper",
                        "insert",
                        {
                            tel: resultTo == null ? "" : resultTo.tel,
                            type: "0",
                            amount: value,
                            status: "2",
                            wallet_address: to,
                            hash: transactionHash,
                            contract_address: scoreTokenAddress,
                            remark: "",
                            user_id: resultTo == null ? "" : resultTo.id
                        },
                        format
                    );
                    await execSql(sqlTo)
                        .then((ret) => {
                            return ret;
                        })
                        .catch((err) => {
                            console.log("ERR:", err);
                            return err;
                        });

                }
            }
        }
    }

    return;
    var format = {language: "sql", indent: "  "};
    var params = {status: 0};
    var sql = mybatisMapper.getStatement(
        "AppJifenRecordHistoryMapper",
        "selectByStatus",
        params,
        format
    );
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
        // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
        // save db
        let trans_from_obj = {
            hash: tx.hash,
            status: 1, // 上链成功
            id: id
        };
        console.log("nftUpdateSelective:", trans_from_obj);

        var paramsUp = trans_from_obj;
        var sqlUp = mybatisMapper.getStatement(
            "AppJifenRecordHistoryMapper",
            "updateByPrimaryKeySelective",
            paramsUp,
            format
        );
        let result = await execSql(sqlUp)
            .then((ret) => {
                return ret;
            })
            .catch((err) => {
                console.error(err, id);
            });
        console.log("update TransFrom data:", result);
    }
    console.log("betcGetHistory All Done!");
}

// betcGetHistory();
setBlockNumber();
// node src/mapper/DreamScoreHistory.js