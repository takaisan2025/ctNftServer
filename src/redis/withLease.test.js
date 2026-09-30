"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

let withLease;
try {
    ({withLease} = require("./withLease"));
} catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
}

test("a busy lease does not run a second transaction batch", async () => {
    assert.equal(typeof withLease, "function");
    let ran = false;
    const result = await withLease({
        setLock: async () => false,
        renewLock: async () => true,
        releaseLock: async () => true
    }, "batch", async () => { ran = true; });
    assert.equal(result.acquired, false);
    assert.equal(ran, false);
});

test("the owner releases its lease after a failed send", async () => {
    assert.equal(typeof withLease, "function");
    let acquiredToken;
    let releasedToken;
    const locks = {
        setLock: async (_key, token) => { acquiredToken = token; return true; },
        renewLock: async () => true,
        releaseLock: async (_key, token) => { releasedToken = token; return true; }
    };
    await assert.rejects(withLease(locks, "sender", async () => {
        throw new Error("RPC rejected transaction");
    }), /RPC rejected transaction/);
    assert.equal(releasedToken, acquiredToken);
});

test("a lost lease prevents the next transaction from being sent", async () => {
    assert.equal(typeof withLease, "function");
    let renew;
    let sent = false;
    const timers = {
        setInterval: callback => { renew = callback; return 1; },
        clearInterval: () => {}
    };
    const locks = {
        setLock: async () => true,
        renewLock: async () => false,
        releaseLock: async () => false
    };
    await assert.rejects(withLease(locks, "sender", async assertHeld => {
        await renew();
        await assertHeld();
        sent = true;
    }, {timers}), /lease lost/i);
    assert.equal(sent, false);
});

test("ownership is checked immediately before a send even before the heartbeat", async () => {
    let sent = false;
    const locks = {setLock: async () => true, renewLock: async () => false,
        releaseLock: async () => false};
    const timers = {setInterval: () => 1, clearInterval: () => {}};
    await assert.rejects(withLease(locks, "sender", async assertHeld => {
        await assertHeld();
        sent = true;
    }, {timers}), /lease lost/i);
    assert.equal(sent, false);
});
