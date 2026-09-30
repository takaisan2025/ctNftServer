"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ethers = require("ethers");
const {transferFundingDeficit} = require("./gasFunding");

test("funding covers the signed gas ceiling instead of a fixed transfer threshold", () => {
    const gasLimit = ethers.BigNumber.from(100000);
    const balance = ethers.utils.parseEther("0.44");
    assert.equal(ethers.utils.formatEther(transferFundingDeficit(gasLimit, balance)), "0.14");
    assert.equal(transferFundingDeficit(gasLimit, ethers.utils.parseEther("0.58")).isZero(), true);
});
