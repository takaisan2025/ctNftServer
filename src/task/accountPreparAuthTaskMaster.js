const child_process = require('child_process');
const {get_mysql} = require("../db/genSql");
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
    exec_sql,
    exec_sql_all,
} = require("../controller/ctnft");
let noAddress = null

async function main() {
    console.log("betchPreaprAuthThread Start !!")
    let nfts_sql_ret = get_mysql("AccountMapper", "selectByStatus", {
        status: 1,
    }); // 资源未上链ipfs的条目
    let nfts_sql = nfts_sql_ret.result;
    let nfts_ret = await exec_sql_all(nfts_sql);
    let accountArr = [];
    if (nfts_ret.err != null) {
        console.trace(responseFunStr(500, nfts_ret.err, {}));
    } else {
        accountArr = nfts_ret.result;
    }

    let processedTransList = spArr(accountArr, 250);

    for (var i = 0; i < processedTransList.length; i++) {
        // if (i == 0) {
        //     noAddress = null;
        // }
        var workerProcess = child_process.spawn('node', ['src/task/accountPreparAuthTaskSub.js', i], {
            env: {
                authTransList: JSON.stringify(processedTransList[i]),
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
                }, 10000);
            }
        });
    }
    console.log("betchPreaprAuthThread End !!")
    if (processedTransList.length == 0) {
        setTimeout(() => {
            main()
        }, 30000);
    }
}

main();
module.exports = {};
// node src\task\transTaskMaster.js
