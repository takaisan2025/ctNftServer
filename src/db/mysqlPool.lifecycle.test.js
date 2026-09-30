"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPool(filename) {
    let queryCallback;
    let releases = 0;
    const connection = {
        query(_sql, callback) { queryCallback = callback; },
        release() { releases += 1; }
    };
    const mysql = {
        createPool() {
            return {getConnection(callback) { callback(null, connection); }};
        },
        escape: value => value
    };
    const source = fs.readFileSync(path.join(__dirname, filename), "utf8");
    const module = {exports: {}};
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require(name) {
            if (name === "mysql") return mysql;
            if (name.startsWith("../config/")) return {MYSQL_CONFIG: {}, MYSQL_CONFIG_PHP: {}};
            throw new Error(`Unexpected dependency: ${name}`);
        },
        Promise
    }, {filename});
    return {
        exec: module.exports.exec,
        complete(error, rows) { queryCallback(error, rows, []); },
        get releases() { return releases; }
    };
}

for (const filename of ["mysqlPool.js", "mysqlPoolPhp.js"]) {
    test(`${filename} retains the connection until a successful query completes`, async () => {
        const pool = loadPool(filename);
        const result = pool.exec("SELECT 1");
        assert.equal(pool.releases, 0);
        pool.complete(null, [{value: 1}]);
        assert.deepEqual(Array.from(await result), [{value: 1}]);
        assert.equal(pool.releases, 1);
    });

    test(`${filename} releases the connection after a query error`, async () => {
        const pool = loadPool(filename);
        const result = pool.exec("SELECT 1");
        assert.equal(pool.releases, 0);
        const error = new Error("query failed");
        pool.complete(error);
        await assert.rejects(result, error);
        assert.equal(pool.releases, 1);
    });
}
