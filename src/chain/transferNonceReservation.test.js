"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadReservation(findRows, {gap = null, latest = 0} = {}) {
    const calls = [];
    const cleared = [];
    const module = {exports: {}};
    const source = fs.readFileSync(path.join(__dirname, "transferNonceReservation.js"), "utf8");
    const op = {ne: Symbol("ne")};
    vm.runInNewContext(source, {
        module, exports: module.exports,
        require(name) {
            if (name === "sequelize") return {Op: op};
            if (name === "../redis/redis-client") return {
                getString: async () => gap,
                removeString: async key => { cleared.push(key); }
            };
            if (name === "../task/taskConst") return {customHttpProvider: {
                getTransactionCount: async () => latest
            }};
            if (name === "../Orm/TransFormListService") return {
                findTransFormListAll: async query => {
                    calls.push(query);
                    return {err: null, result: findRows(query, calls.length)};
                }
            };
            throw new Error(`Unexpected dependency: ${name}`);
        }
    }, {filename: "transferNonceReservation.js"});
    return {hasReservedTransferNonce: module.exports.hasReservedTransferNonce, calls, cleared};
}

test("an earlier in-flight transfer blocks another nonce from the same account", async () => {
    const {hasReservedTransferNonce, calls} = loadReservation(() => [{id: 1, nonce: 3}]);
    assert.equal(await hasReservedTransferNonce("0xsender", 4, 2), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].where.t_status, 5);
});

test("a dropped order retains its old nonce ahead of a new order", async () => {
    const {hasReservedTransferNonce, calls} = loadReservation((_query, n) =>
        n === 1 ? [] : [{id: 1, nonce: 3}]);
    assert.equal(await hasReservedTransferNonce("0xsender", 3, 2), true);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].where.t_status, 1);
    assert.equal(calls[1].where.nonce, "3");
});

test("a journaled gap fill blocks later sends until its nonce is mined", async () => {
    const gap = JSON.stringify({nonce: 3, hash: "0xabc"});
    const blocked = loadReservation(() => [], {gap, latest: 3});
    assert.equal(await blocked.hasReservedTransferNonce("0xSender", 4), true);
    assert.equal(blocked.calls.length, 0);
    assert.equal(await blocked.hasReservedTransferNonce("0xSender", 3, null, true), false);

    const mined = loadReservation(() => [], {gap, latest: 4});
    assert.equal(await mined.hasReservedTransferNonce("0xSender", 4), false);
    assert.deepEqual(mined.cleared, ["GAP_FILL:0xsender"]);
});
