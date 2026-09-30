"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("a dropped higher-nonce order fills the gap without changing its recorded hash", async () => {
    const address = "0x" + "1".repeat(40);
    const row = {id: 50, t_status: 1, t_from: address,
        hash: "0x" + "a".repeat(64), nonce: "4"};
    const fills = [];
    const updates = [];
    const provider = {
        getTransactionReceipt: async () => null,
        getTransaction: async () => null,
        getTransactionCount: async (_address, tag) => tag === "latest" ? 3 : 3,
        getBalance: async () => 1
    };
    const dependencies = {
        "../redis/redis-client": {getKeys: async () => [], getString: async () => null,
            setString: async () => "OK", setLock: async () => true,
            renewLock: async () => true, releaseLock: async () => true},
        "../redis/withLease": {withLease: async (_locks, _key, work) =>
            ({acquired: true, value: await work(async () => {})})},
        "../Orm/TransFormListService": {
            findTransFormListAll: async () => ({err: null, result: [row]}),
            updateTransFormList: async (...args) => { updates.push(args); }
        },
        "../Orm/AccountService": {findAccount: async () =>
            ({err: null, result: {address, psd: "password"}})},
        "../Orm/CollectService": {findCollect: async () =>
            ({err: null, result: {owner: address}})},
        "../chain/accountProUtils": {getPriKey: async () =>
            ({err: null, result: {privateKey: "0xkey"}})},
        "../chain/nonceManager": require("../chain/nonceManager"),
        "../chain/transferNonceReservation": {hasReservedTransferNonce: async () => false},
        "../chain/gasFunding": {transferFundingDeficit: () => ({isZero: () => true})},
        "../chain/gapFiller": {fillNonceGap: async args => {
            fills.push(args);
            return {action: "sent", tx: {hash: "0xfill"}};
        }},
        "./taskConst": {getCustomHttpProvider: () => provider},
        "ethers": {Wallet: class {constructor() { this.address = address; }}},
        "sequelize": {Op: {not: Symbol("not")}}
    };
    const module = {exports: {}};
    const source = fs.readFileSync(path.join(__dirname, "transTask.js"), "utf8");
    vm.runInNewContext(source, {module, exports: module.exports,
        require: name => dependencies[name] || {},
        console: {log() {}, error() {}, trace() {}, time() {}, timeEnd() {}},
        Buffer, Promise}, {filename: "transTask.js"});
    await module.exports.betchTransfer();
    assert.equal(fills.length, 1);
    assert.equal(fills[0].nonce, 3);
    assert.equal(updates.length, 0);
    assert.equal(row.hash, "0x" + "a".repeat(64));
    assert.equal(row.nonce, "4");
});
