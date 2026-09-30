"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "redis.js"), "utf8");

function loadRedis(env) {
    let auth;
    let dotenvPath;
    const client = {on() {}};
    const module = {exports: {}};
    const run = () => vm.runInNewContext(source, {
        module,
        exports: module.exports,
        __dirname,
        process: {env},
        console: {log() {}, error() {}},
        require(name) {
            if (name === "redis") return {
                createClient(_port, _host, options) {
                    auth = options.auth_pass;
                    return client;
                }
            };
            if (name === "dotenv") return {config(options) { dotenvPath = options.path; }};
            if (name === "node:path") return path;
            throw new Error(`Unexpected dependency: ${name}`);
        }
    }, {filename: "redis.js"});
    return {run, get auth() { return auth; }, get dotenvPath() { return dotenvPath; }};
}

test("Redis client uses the runtime password from the ignored environment file", () => {
    const loader = loadRedis({REDIS_PASSWORD: "runtime-only-secret"});
    loader.run();
    assert.equal(loader.auth, "runtime-only-secret");
    assert.equal(loader.dotenvPath, path.resolve(__dirname, "../../.env"));
});

test("Redis client refuses to start without a password", () => {
    const loader = loadRedis({});
    assert.throws(loader.run, /REDIS_PASSWORD/);
});
