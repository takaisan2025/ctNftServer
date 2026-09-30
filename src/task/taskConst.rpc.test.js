"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("successive background batches use the same RPC node for nonce and receipt reads", () => {
    const source = fs.readFileSync(path.join(__dirname, "taskConst.js"), "utf8");
    const urls = ["https://node-a", "https://node-b"];
    const providerUrls = [];
    const web3Urls = [];
    const module = {exports: {}};
    class JsonRpcProvider {
        constructor(url) { providerUrls.push(url); this.url = url; }
    }
    class HttpProvider {
        constructor(url) { this.url = url; }
    }
    class Web3 {
        static providers = {HttpProvider};
        constructor(provider) { web3Urls.push(provider.url); }
    }
    vm.runInNewContext(source, {
        module, exports: module.exports,
        require(name) {
            if (name === "../config/GlobalConfig.json") {
                return {BLOCK_CHAIN: {RPC_URL: urls.map(url => ({url}))}};
            }
            if (name === "ethers") return {providers: {JsonRpcProvider}};
            if (name === "web3") return Web3;
            if (name === "ethereumjs-util") return {keccak256: () => Buffer.alloc(32)};
            throw new Error(`Unexpected dependency: ${name}`);
        },
        Buffer, console
    }, {filename: "taskConst.js"});
    const {customHttpProvider, getCustomHttpProvider, getWeb3} = module.exports;
    assert.equal(customHttpProvider, getCustomHttpProvider());
    assert.equal(customHttpProvider, getCustomHttpProvider());
    getWeb3();
    getWeb3();
    assert.deepEqual(providerUrls, [urls[0]]);
    assert.deepEqual(web3Urls, [urls[0], urls[0], urls[0]]);
});
