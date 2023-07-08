const child_process = require('child_process');
const {get_mysql} = require("../db/genSql");
const {
    isJson,
    stripHexPrefix,
    validateAddress,
    checkURL,
    isEmpty
} = require("../rules/rules");
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");

function spArr(arr, num) { //arr是你要分割的数组，num是以几个为一组
    let newArr = [] //首先创建一个新的空数组。用来存放分割好的数组
    for (let i = 0; i < arr.length;) { //注意：这里与for循环不太一样的是，没有i++
        newArr.push(arr.slice(i, i += num));
    }
    return newArr
}

const {
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
async function main() {
    console.log("betchTransferThread Start !!")
    let countTh = 0;
    var params = {t_status: 8};
    var sql = get_mysql(
        "trans_form_list",
        "selectByStatusDesc",
        params
    ).result;

    let transList_ret = await exec_sql_all(sql)
    let transList = []
    if (transList_ret.err != null) {
        console.trace("ERR:", transList_ret.err);
    }
    transList = transList_ret.result
    let processedTransList = spArr(transList, 250);
    // console.log(processedTransList[0])
    for (var i = 0; i < processedTransList.length; i++) {

        // 设置列表
        // await setString("spTransList" + i, JSON.stringify(processedTransList[i]));
        await setString("spTransList_1", JSON.stringify(processedTransList[i]));

        var workerProcess = child_process.spawn('node', ['src/task/transTaskReCallSub1.js', i], {
            env: {
                spTransList_index: i,
                PATH: process.env.PATH
            }
        });


        workerProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });

        workerProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        workerProcess.on('close', function (code) {
            console.log('子进程已退出，退出码 ' + code);
            countTh += 1;
            console.log('countTh ' + countTh);
            if (countTh == processedTransList.length) {
                countTh = 0;
                setTimeout(() => {
                    main()
                }, 1000);
            }
        });
    }
    console.log("betchTransferReCallThread End !!")
    if (processedTransList.length == 0) {
        setTimeout(() => {
            main()
        }, 3000);
    }
}

main();
module.exports = {};
// node src\task\transTaskReCallMaster1.js
