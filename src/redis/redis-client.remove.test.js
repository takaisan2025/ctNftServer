"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadClient(previousValue) {
    let removed = false;
    const redis = {
        get(_key, callback) { callback(null, previousValue); },
        expire(_key, _seconds, callback) {
            setImmediate(() => {
                removed = true;
                if (callback) callback(null, 1);
            });
        },
        eval(_script, _count, _key, callback) {
            setImmediate(() => {
                removed = true;
                callback(null, previousValue);
            });
        }
    };
    const source = fs.readFileSync(path.join(__dirname, "redis-client.js"), "utf8");
    const module = {exports: {}};
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require: name => name === "./redis" ? redis : {REDIS_GLOBAL_PREFIX: "test:"},
        Promise,
        setTimeout
    }, {filename: "redis-client.js"});
    return {api: module.exports, wasRemoved: () => removed};
}

test("removeString waits for deletion before returning the old value", async () => {
    const client = loadClient("busy");
    const oldValue = await client.api.removeString("job-flag");
    assert.equal(oldValue, "busy");
    assert.equal(client.wasRemoved(), true);
});

test("removeString preserves null when the key does not exist", async () => {
    const client = loadClient(null);
    assert.equal(await client.api.removeString("missing"), null);
    assert.equal(client.wasRemoved(), true);
});
