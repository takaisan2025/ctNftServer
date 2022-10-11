const child_process = require('child_process');

function spArr(arr, num) { //arr是你要分割的数组，num是以几个为一组
    let newArr = [] //首先创建一个新的空数组。用来存放分割好的数组
    for (let i = 0; i < arr.length;) { //注意：这里与for循环不太一样的是，没有i++
        newArr.push(arr.slice(i, i += num));
    }
    return newArr
}

let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9]
console.log(spArr(arr, 4))
let processedArr = spArr(arr, 4);
// for (let i = 0; i < processedArr.length; i++) {
//     var workerProcess = child_process.spawn('node src/mapper/test.js ', {
//         env: {
//             a: processedArr[i]
//         }
//     }, function (error, stdout, stderr) {
//         if (error) {
//             console.log(error.stack);
//             console.log('Error code: ' + error.code);
//             console.log('Signal received: ' + error.signal);
//         }
//         console.log('stdout: ' + stdout);
//         console.log('stderr: ' + stderr);
//     });
//
//     workerProcess.on('exit', function (code) {
//         console.log('子进程已退出，退出码 ' + code);
//     });
// }

for (let i = 0; i < processedArr.length; i++) {
    var workerProcess = child_process.spawn('node', ['src/mapper/test.js', i], {
        env: {
            a: processedArr[i]
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
    });
}

// node src\mapper\process_test.js