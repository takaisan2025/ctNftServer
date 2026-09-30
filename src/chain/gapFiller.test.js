"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ethers = require("ethers");
const {fillNonceGap} = require("./gapFiller");

const locks = {setLock: async () => true, renewLock: async () => true,
    releaseLock: async () => true};
const wallet = new ethers.Wallet("0x" + "2".repeat(64));

test("a gap fill is a deterministic self-transfer and never changes a business order", async () => {
    const raws = [];
    const recorded = [];
    const provider = {
        getNetwork: async () => ({chainId: 27}),
        getTransactionCount: async () => 3,
        sendTransaction: async raw => {
            raws.push(raw);
            if (raws.length === 1) throw new Error("RPC timeout");
            return {hash: ethers.utils.keccak256(raw)};
        }
    };
    const args = {locks, provider, wallet, nonce: 3, hasReservation: async () => false,
        persist: async record => {
            assert.equal(raws.length, recorded.length);
            recorded.push(record);
        }};
    await assert.rejects(fillNonceGap(args), /RPC timeout/);
    const result = await fillNonceGap(args);
    assert.equal(result.action, "sent");
    assert.equal(raws[0], raws[1]);
    assert.equal(recorded[0].hash, recorded[1].hash);
    const tx = ethers.utils.parseTransaction(raws[1]);
    assert.equal(tx.nonce, 3);
    assert.equal(tx.to, wallet.address);
    assert.equal(tx.value.isZero(), true);
    assert.equal(tx.gasLimit.toNumber(), 21000);
});

test("a filled or reserved gap cannot send a no-op transaction", async () => {
    let sends = 0;
    const provider = {getTransactionCount: async () => 4,
        sendTransaction: async () => { sends++; throw new Error("unexpected send"); }};
    const changed = await fillNonceGap({locks, provider, wallet, nonce: 3,
        hasReservation: async () => false});
    assert.equal(changed.action, "nonce-changed");
    provider.getTransactionCount = async () => 3;
    const reserved = await fillNonceGap({locks, provider, wallet, nonce: 3,
        hasReservation: async () => true});
    assert.equal(reserved.action, "reserved");
    assert.equal(sends, 0);
});
