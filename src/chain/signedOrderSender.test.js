"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

let submitSignedOrder;
let sendAtPendingNonce;
try {
    ({submitSignedOrder, sendAtPendingNonce} = require("./signedOrderSender"));
} catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
}

function setup({busy = false, previous = {}, persistFails = false, transaction = null} = {}) {
    const events = [];
    const locks = {
        setLock: async () => !busy,
        renewLock: async () => true,
        releaseLock: async () => true
    };
    const provider = {
        getTransactionCount: async (_address, tag) => tag === "latest" ? 12847 : 12847,
        getTransactionReceipt: async () => null,
        getTransaction: async () => transaction
    };
    const options = {
        locks, provider, address: "0x" + "1".repeat(40), previous,
        hasReservation: async () => false,
        prepare: async nonce => { events.push("prepare"); return {nonce, to: "recipient"}; },
        sign: async tx => { events.push("sign"); return `signed:${tx.nonce}`; },
        hashSigned: () => "0x" + "a".repeat(64),
        persist: async record => {
            events.push("persist");
            assert.equal(record.nonce, 12847);
            if (persistFails) throw new Error("database unavailable");
        },
        broadcast: async () => { events.push("broadcast"); }
    };
    return {options, events};
}

test("an order is recorded before its signed bytes reach the chain", async () => {
    assert.equal(typeof submitSignedOrder, "function");
    const {options, events} = setup();
    const result = await submitSignedOrder(options);
    assert.equal(result.action, "sent");
    assert.deepEqual(events, ["prepare", "sign", "persist", "broadcast"]);
});

test("a database failure prevents broadcasting an untracked order", async () => {
    assert.equal(typeof submitSignedOrder, "function");
    const {options, events} = setup({persistFails: true});
    await assert.rejects(submitSignedOrder(options), /database unavailable/);
    assert.deepEqual(events, ["prepare", "sign", "persist"]);
});

test("an in-pool order is never signed a second time", async () => {
    assert.equal(typeof submitSignedOrder, "function");
    const {options, events} = setup({previous: {hash: "0xold", nonce: "12847"},
        transaction: {hash: "0xold", nonce: 12847, blockNumber: null}});
    const result = await submitSignedOrder(options);
    assert.equal(result.action, "in-flight");
    assert.deepEqual(events, []);
});

test("another worker's sender lease prevents any send", async () => {
    assert.equal(typeof submitSignedOrder, "function");
    const {options, events} = setup({busy: true});
    const result = await submitSignedOrder(options);
    assert.equal(result.action, "busy");
    assert.deepEqual(events, []);
});

test("a nonce reserved by an older order is not taken by a new order", async () => {
    const {options, events} = setup();
    options.hasReservation = async nonce => nonce === 12847;
    const result = await submitSignedOrder(options);
    assert.equal(result.action, "reserved");
    assert.deepEqual(events, []);
});

test("an uncertain RPC broadcast retains the persisted hash for reconciliation", async () => {
    const {options, events} = setup();
    options.broadcast = async () => { events.push("broadcast"); throw new Error("RPC timeout"); };
    await assert.rejects(submitSignedOrder(options), /RPC timeout/);
    assert.deepEqual(events, ["prepare", "sign", "persist", "broadcast"]);
});

test("a rejected auxiliary send does not advance the next nonce", async () => {
    assert.equal(typeof sendAtPendingNonce, "function");
    const seen = [];
    const locks = {setLock: async () => true, renewLock: async () => true,
        releaseLock: async () => true};
    const provider = {getTransactionCount: async () => 12};
    const args = {locks, provider, address: "0x" + "1".repeat(40),
        hasReservation: async () => false};
    await assert.rejects(sendAtPendingNonce({...args, send: async nonce => {
        seen.push(nonce);
        throw new Error("underpriced");
    }}), /underpriced/);
    const result = await sendAtPendingNonce({...args, send: async nonce => {
        seen.push(nonce);
        return {hash: "0xabc"};
    }});
    assert.deepEqual(seen, [12, 12]);
    assert.equal(result.action, "sent");
});
