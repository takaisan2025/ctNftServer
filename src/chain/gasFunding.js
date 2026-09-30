"use strict";

const ethers = require("ethers");

const TRANSFER_MAX_FEE_PER_GAS = ethers.BigNumber.from("4800000000000");
const TRANSFER_GAS_RESERVE = ethers.utils.parseEther("0.1");

function transferFundingDeficit(gasLimit, balance) {
    const required = ethers.BigNumber.from(gasLimit)
        .mul(TRANSFER_MAX_FEE_PER_GAS)
        .add(TRANSFER_GAS_RESERVE);
    const current = ethers.BigNumber.from(balance);
    return current.gte(required) ? ethers.constants.Zero : required.sub(current);
}

module.exports = {TRANSFER_MAX_FEE_PER_GAS, transferFundingDeficit};
