"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("the same scheduled job never overlaps itself", async () => {
    const scheduled = [];
    let calls = 0;
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const noop = async () => {};
    const source = fs.readFileSync(path.join(__dirname, "backgroundAll.js"), "utf8");
    vm.runInNewContext(source, {
        require(name) {
            if (name === "./task/transTask") {
                return {betchTransfer: async () => { calls += 1; await pending; }};
            }
            return new Proxy({}, {get: () => noop});
        },
        setInterval: callback => { scheduled.push(callback); },
        process: {on() {}},
        console: {log() {}, error() {}},
        Promise
    }, {filename: "backgroundAll.js"});

    const first = scheduled[0]();
    const overlapping = scheduled[0]();
    assert.equal(calls, 1);
    finish();
    await Promise.all([first, overlapping]);
    await scheduled[0]();
    assert.equal(calls, 2);
});
