"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadCallbackTask() {
    const events = [];
    let completeFetch;
    const fetchResult = new Promise(resolve => { completeFetch = resolve; });
    const module = {exports: {}};
    const source = fs.readFileSync(path.join(__dirname, "transTaskReCallUtils.js"), "utf8");
    const dependencies = {
        "form-data": class {
            append() {}
            getBoundary() { return "boundary"; }
        },
        "node-fetch": () => {
            events.push("fetch-started");
            return fetchResult;
        },
        "./taskConst": {formatTime: () => "date"},
        "../redis/redis-client": {
            getString: async () => null,
            setString: async () => { events.push("flag-set"); },
            removeString: async () => { events.push("flag-removed"); }
        },
        "../Orm/TransFormListService": {
            findTransFormListAll: async () => ({
                err: null,
                result: [{id: 7, token_id: "token", hash: "hash", update_time: 0,
                    orderId: "order", reback_url: "https://callback.example/result"}]
            }),
            updateTransFormList: async (change, where) => {
                events.push(`status-${change.t_status}-${where.id}`);
            }
        }
    };
    const silentConsole = {log() {}, trace() {}, time() {}, timeEnd() {}};
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require(name) {
            if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
            return dependencies[name];
        },
        console: silentConsole,
        Promise
    }, {filename: "transTaskReCallUtils.js"});
    return {run: module.exports.betchCallFundUtils, events,
        completeFetch: () => completeFetch({status: 200, statusText: "OK",
            json: async () => ({status: 1})})};
}

test("callback task retains its running flag until HTTP and status update finish", async () => {
    const task = loadCallbackTask();
    const running = task.run("callback", 9, "query", {});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(task.events.includes("fetch-started"), true);
    assert.equal(task.events.includes("flag-removed"), false);

    task.completeFetch();
    await running;
    assert.deepEqual(task.events.slice(-2), ["status-4-7", "flag-removed"]);
});
