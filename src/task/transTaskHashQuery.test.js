"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadHashQuery({rows, receipts, transactions, latestNonce}) {
    const updates = [];
    const offsets = [];
    const source = fs.readFileSync(path.join(__dirname, "transTaskHashQuery.js"), "utf8");
    const module = {exports: {}};
    const web3 = {
        BatchRequest: class {
            constructor() { this.requests = []; }
            add(request) { this.requests.push(request); }
            execute() {
                for (const request of this.requests) {
                    request.callback(null, receipts[request.hash] ?? null);
                }
            }
        },
        eth: {
            getTransactionReceipt: {
                request: (hash, callback) => ({hash, callback})
            },
            getTransaction: async hash => transactions[hash] ?? null,
            getTransactionCount: async () => latestNonce
        }
    };
    const dependencies = {
        "../redis/redis-client": {
            getString: async () => null,
            setString: async () => "OK",
            removeString: async () => 1
        },
        "../Orm/TransFormListService": {
            findTransFormListAll: async param => {
                offsets.push(param.offset);
                return {err: null, result: rows.slice(param.offset, param.offset + param.limit)};
            },
            updateTransFormList: async (change, where) => { updates.push({change, where}); }
        },
        "./taskConst": {getWeb3: () => web3}
    };
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require: name => dependencies[name],
        console: {log() {}, trace() {}, time() {}, timeEnd() {}},
        Date,
        Promise
    }, {filename: "transTaskHashQuery.js"});
    return {betchHashQuery: module.exports.betchHashQuery, updates, offsets};
}

test("a pending transaction is not requeued merely because its receipt is late", async () => {
    const hash = "0x" + "a".repeat(64);
    const row = {
        id: 7,
        t_status: 5,
        t_from: "0x" + "1".repeat(40),
        nonce: "12847",
        hash,
        update_time: new Date(Date.now() - 31000)
    };
    const {betchHashQuery, updates} = loadHashQuery({
        rows: [row],
        receipts: {},
        transactions: {[hash]: {hash, nonce: 12847, blockNumber: null}},
        latestNonce: 12847
    });

    await betchHashQuery();
    assert.deepEqual(updates, []);
});

test("a recently missing transaction waits before retry", async () => {
    const hash = "0x" + "b".repeat(64);
    const {betchHashQuery, updates} = loadHashQuery({
        rows: [{id: 8, t_status: 5, t_from: "0x" + "2".repeat(40), nonce: "40", hash,
            update_time: new Date(Date.now() - 31000)}],
        receipts: {}, transactions: {}, latestNonce: 40
    });

    await betchHashQuery();
    assert.deepEqual(updates, []);
});

test("a dropped transaction can retry only while its nonce is unspent", async () => {
    const hash = "0x" + "c".repeat(64);
    const {betchHashQuery, updates} = loadHashQuery({
        rows: [{id: 9, t_status: 5, t_from: "0x" + "3".repeat(40), nonce: "41", hash,
            update_time: new Date(Date.now() - 6 * 60 * 1000)}],
        receipts: {}, transactions: {}, latestNonce: 41
    });

    await betchHashQuery();
    assert.equal(updates.length, 1);
    assert.equal(updates[0].change.t_status, 1);
    assert.equal(updates[0].where.id, 9);
    assert.equal(updates[0].where.t_status, 5);
    assert.equal(updates[0].where.hash, hash);
});

test("a consumed nonce is not retried when its receipt is unavailable", async () => {
    const hash = "0x" + "d".repeat(64);
    const {betchHashQuery, updates} = loadHashQuery({
        rows: [{id: 10, t_status: 5, t_from: "0x" + "4".repeat(40), nonce: "42", hash,
            update_time: new Date(Date.now() - 6 * 60 * 1000)}],
        receipts: {}, transactions: {}, latestNonce: 43
    });

    await betchHashQuery();
    assert.deepEqual(updates, []);
});

test("old unresolved rows do not starve later mined receipts", async () => {
    const now = new Date(Date.now() - 6 * 60 * 1000);
    const rows = Array.from({length: 16}, (_, id) => ({
        id, t_status: 5, t_from: "0x" + "5".repeat(40), nonce: String(id),
        hash: "0x" + id.toString(16).padStart(64, "0"), update_time: now
    }));
    const {betchHashQuery, updates, offsets} = loadHashQuery({
        rows,
        receipts: {[rows[15].hash]: {status: true}},
        transactions: Object.fromEntries(rows.slice(0, 15).map(row => [row.hash, {hash: row.hash}])),
        latestNonce: 0
    });
    await betchHashQuery();
    await betchHashQuery();
    assert.deepEqual(offsets, [0, 15]);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].where.id, 15);
    assert.equal(updates[0].change.t_status, 6);
});
