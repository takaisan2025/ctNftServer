"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadLockClient({setResult, evalResult}) {
    const calls = [];
    const client = {
        set(...args) {
            calls.push({method: "set", args: args.slice(0, -1)});
            const callback = args.at(-1);
            if (typeof callback === "function") queueMicrotask(() => callback(null, setResult));
            return true; // redis v3 returns whether the command was queued, not SET's reply
        },
        eval(...args) {
            calls.push({method: "eval", args: args.slice(0, -1)});
            const callback = args.at(-1);
            if (typeof callback === "function") queueMicrotask(() => callback(null, evalResult));
            return true;
        }
    };
    const source = fs.readFileSync(path.join(__dirname, "redis-client.js"), "utf8");
    const module = {exports: {}};
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require: name => name === "./redis" ? client : {REDIS_GLOBAL_PREFIX: "test:"},
        setTimeout,
        Promise
    }, {filename: "redis-client.js"});
    return {api: module.exports, calls};
}

test("a queued Redis SET does not count as acquiring a busy nonce lock", async () => {
    const {api} = loadLockClient({setResult: null, evalResult: 0});
    assert.equal(await api.setLock("sender", "owner-a", 30000), false);
});

test("a Redis SET reply grants the nonce lock", async () => {
    const {api, calls} = loadLockClient({setResult: "OK", evalResult: 1});
    assert.equal(await api.setLock("sender", "owner-a", 30000), true);
    assert.equal(calls[0].method, "set");
    assert.deepEqual(Array.from(calls[0].args), ["sender", "owner-a", "NX", "PX", 30000]);
});

test("lock release returns the server's ownership result", async () => {
    const {api} = loadLockClient({setResult: "OK", evalResult: 0});
    assert.equal(await api.releaseLock("sender", "wrong-owner"), false);
});

test("an expired owner cannot renew another worker's lease", async () => {
    const {api} = loadLockClient({setResult: "OK", evalResult: 0});
    assert.equal(api.renewLock && await api.renewLock("sender", "old-owner", 30000), false);
});
