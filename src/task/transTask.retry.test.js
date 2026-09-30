"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("a requeued order with a transaction still in the pool returns to receipt tracking", async () => {
    const hash = "0x" + "a".repeat(64);
    const row = {id: 17, t_status: 1, t_from: "0x" + "1".repeat(40),
        hash, nonce: "12847"};
    const updates = [];
    const provider = {
        getTransactionReceipt: async () => null,
        getTransaction: async () => ({hash, nonce: 12847, blockNumber: null}),
        getTransactionCount: async () => 12847
    };
    const dependencies = {
        "../redis/redis-client": {getKeys: async () => [], getString: async () => null,
            setLock: async () => true,
            renewLock: async () => true, releaseLock: async () => true},
        "../redis/withLease": {withLease: async (_locks, _key, work) =>
            ({acquired: true, value: await work(() => {})})},
        "../Orm/TransFormListService": {
            findTransFormListAll: async () => ({err: null, result: [row]}),
            updateTransFormList: async (change, where) => { updates.push({change, where}); }
        },
        "./taskConst": {getCustomHttpProvider: () => provider},
        "../chain/nonceManager": require("../chain/nonceManager"),
        "sequelize": {Op: {not: Symbol("not"), ne: Symbol("ne"), in: Symbol("in")}}
    };
    const source = fs.readFileSync(path.join(__dirname, "transTask.js"), "utf8");
    const module = {exports: {}};
    vm.runInNewContext(source, {
        module, exports: module.exports,
        require: name => dependencies[name] || {},
        console: {log() {}, error() {}, trace() {}, time() {}, timeEnd() {}},
        Buffer, Promise
    }, {filename: "transTask.js"});

    await module.exports.betchTransfer();
    assert.equal(updates.length, 1);
    assert.equal(updates[0].change.t_status, 5);
    assert.equal(updates[0].where.id, 17);
});
