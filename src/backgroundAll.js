"use strict";
// 合并后台入口：将原 9 个独立后台进程的任务合并到单进程，节省 ~850MB 内存。
// 每个任务用 wrap 包裹做故障隔离，单个任务抛错不影响其它任务与进程。

function wrap(name, fn) {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (e) {
            console.error(`[backgroundAll] task ${name} error:`, e && e.message ? e.message : e);
        }
    };
}

const {betchCallByTime} = require("./task/transTaskReCallByTime");
const {SubmitTransactionTask, TransactionHashQueryTask} = require("./task/submitTransactionTask");
const {betchCallFund1} = require("./task/transTaskReCall1");
const {betchCallFund} = require("./task/transTaskReCall");
const {betchTransfer} = require("./task/transTask");
const {betchHashQuery} = require("./task/transTaskHashQuery");
const {tFeeBetchTransfer, tFeeBetchHashQuery} = require('./task/transFeeTask');
const {
    mintFileUploadIpfs,
    mintBetchMint,
    mintBetchHashQuery,
    mintBetchCallFund
} = require('./task/mintTask');
const {baoyueTransfer} = require("./task/baoyueTask");

// fooDataTask 为自启动模块（内部 setTimeout 递归），require 即运行
require("./task/fooDataTask");

console.log('backgroundAll: Starting (merged background)');

// transfer（原 transTaskBackground / betchHashQueryBackground）
setInterval(wrap('betchTransfer', betchTransfer), 3000);
setInterval(wrap('betchHashQuery', betchHashQuery), 1000);
setInterval(wrap('TransactionHashQueryTask', TransactionHashQueryTask), 1000);
// background（原 background）
setInterval(wrap('betchCallFund', betchCallFund), 2000);
setInterval(wrap('betchCallFund1', betchCallFund1), 30000);
setInterval(wrap('betchCallByTime', betchCallByTime), 30000);
setInterval(wrap('tFeeBetchTransfer', tFeeBetchTransfer), 5000);
setInterval(wrap('tFeeBetchHashQuery', tFeeBetchHashQuery), 5000);
// mint（原 MintFileUploadIpfs / MintBetchMint / MintBetchCallFund / betchHashQueryBackground）
setInterval(wrap('mintFileUploadIpfs', mintFileUploadIpfs), 5000);
setInterval(wrap('mintBetchMint', mintBetchMint), 5000);
setInterval(wrap('mintBetchHashQuery', mintBetchHashQuery), 1000);
setInterval(wrap('mintBetchCallFund', mintBetchCallFund), 5000);
// auth（原 SubmitTransaction / betchHashQueryBackground）
setInterval(wrap('SubmitTransactionTask', SubmitTransactionTask), 5000);
// baoyue（原 baoyue）
setInterval(wrap('baoyueTransfer', baoyueTransfer), 60000);

process.on('uncaughtException', e => console.error('[backgroundAll] uncaughtException:', e && e.message ? e.message : e));
process.on('unhandledRejection', e => console.error('[backgroundAll] unhandledRejection:', e && e.message ? e.message : e));
