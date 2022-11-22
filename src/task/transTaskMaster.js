const child_process = require('child_process');
const {getMysqlSqlByTabNameAndSqlNameAndParam} = require("../db/genSql");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    validateAddressBalanceEnough,
    checkURL,
    isEmpty
} = require("../rules/rules");

function spArr(arr, num) { //arr是你要分割的数组，num是以几个为一组
    let newArr = [] //首先创建一个新的空数组。用来存放分割好的数组
    for (let i = 0; i < arr.length;) { //注意：这里与for循环不太一样的是，没有i++
        newArr.push(arr.slice(i, i += num));
    }
    return newArr
}

const {
    execSql,
    execSqlAll,
} = require("../controller/ctnft");
let noAddress = null

async function main() {
    console.log("betchTransferThread Start !!")
    let countTh = 0;

    var sql
    var params;
    if (noAddress == null) {
        params = {t_status: 1};
        sql = getMysqlSqlByTabNameAndSqlNameAndParam(
            "trans_form_list",
            "selectByStatus",
            params
        ).result;
    } else {
        params = {t_status: 1, t_from: noAddress};
        // params = {t_status: 1, collectAddress: noAddress};
        sql = getMysqlSqlByTabNameAndSqlNameAndParam(
            "trans_form_list",
            "selectByStatusAndNoFrom",
            params
        ).result;
    }
    sql = sql.replace("! =", "!=")
    // console.log("betchTransferThread", sql)
    let transList = await execSqlAll(sql)
        .then((ret) => {
            return ret;
        })
        .catch((err) => {
            console.trace("ERR:", err);
            return err;
        });

    let processedTransList = spArr(transList, 50);

    // console.log(processedTransList[0])
    for (var i = 0; i < processedTransList.length; i++) {
        // if (i == 0) {
        //     noAddress = null;
        // }
        var workerProcess = child_process.spawn('node', ['src/task/transTaskSub.js', i], {
            env: {
                spTransList: JSON.stringify(processedTransList[i]),
                PATH: process.env.PATH
            }
        });

        workerProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            if (validateAddressBalanceEnough(data.toString().trim()).flag == true) {
                noAddress = data.toString().trim().replace("草田分余额不足: ", '')
                noAddress = noAddress.slice(0, 42)
                if (validateAddress(noAddress).flag == false) {
                    noAddress = null;
                }
            }
        });

        workerProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        workerProcess.on('close', function (code) {
            console.log('子进程已退出，退出码 ' + code);
            countTh += 1;
            console.log('countTh ' + countTh);
            if (countTh == processedTransList.length) {
                setTimeout(() => {
                    main()
                }, 1000);
            }
        });
    }
    console.log("betchTransferThread End !!")
    if (processedTransList.length == 0) {
        setTimeout(() => {
            main()
        }, 3000);
    }
}

main();
module.exports = {};
// node src\task\transTaskMaster.js
