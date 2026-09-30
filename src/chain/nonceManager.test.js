"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

let chooseNonce;
try {
    ({chooseNonce} = require("./nonceManager"));
} catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
}

function provider({latest, pending, transaction = null, receipt = null}) {
    return {
        getTransactionCount: async (_address, tag) => tag === "pending" ? pending : latest,
        getTransaction: async () => transaction,
        getTransactionReceipt: async () => receipt
    };
}

test("a new order takes the first pending nonce, including an existing gap", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 12847, pending: 12847}), "sender", {});
    assert.deepEqual(decision, {action: "send", nonce: 12847});
});

test("a late receipt cannot cause an in-pool order to be sent again", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 8, pending: 9,
        transaction: {hash: "0xabc", nonce: 8, blockNumber: null}}), "sender",
    {hash: "0xabc", nonce: "8"});
    assert.deepEqual(decision, {action: "in-flight"});
});

test("a genuinely dropped order reuses its original nonce", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 8, pending: 8}), "sender",
        {hash: "0xabc", nonce: "8"});
    assert.deepEqual(decision, {action: "send", nonce: 8});
});

test("a consumed nonce with no receipt is never replaced by a different order", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 9, pending: 9}), "sender",
        {hash: "0xabc", nonce: "8"});
    assert.deepEqual(decision, {action: "consumed-unknown"});
});

test("a prior order waits for an earlier nonce gap", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 8, pending: 8}), "sender",
        {hash: "0xabc", nonce: "10"});
    assert.deepEqual(decision, {action: "earlier-gap", nonce: 8});
});

test("an already mined order is reconciled instead of sent again", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 9, pending: 9,
        receipt: {status: 1, transactionHash: "0xabc"}}), "sender",
    {hash: "0xabc", nonce: "8"});
    assert.deepEqual(decision, {action: "mined-success"});
});

test("a reverted transaction can retry with the next pending nonce", async () => {
    assert.equal(typeof chooseNonce, "function");
    const decision = await chooseNonce(provider({latest: 9, pending: 9,
        receipt: {status: 0, transactionHash: "0xabc"}}), "sender",
    {hash: "0xabc", nonce: "8"});
    assert.deepEqual(decision, {action: "send", nonce: 9});
});

test("a legacy hash without a nonce is not blindly sent again", async () => {
    const decision = await chooseNonce(provider({latest: 9, pending: 9}), "sender",
        {hash: "0xabc", nonce: null});
    assert.deepEqual(decision, {action: "unknown-nonce"});
});
