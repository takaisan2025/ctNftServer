"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ethers = require("ethers");
const ABI = require("../contract/CtTransferExecutor.json").abi;

test("the production transfer ABI can be populated and signed as an EIP-1559 transaction", async () => {
    const wallet = ethers.Wallet.createRandom();
    const contract = new ethers.Contract("0x000000000000000000000000000000000000dEaD", ABI, wallet);
    const unsigned = await contract.populateTransaction.transfer(
        "0x12345678", wallet.address, wallet.address, wallet.address,
        1, 2, 1, "0x12345678", "0x12345678", "0x",
        {
            nonce: 12847,
            gasLimit: 200000,
            maxFeePerGas: ethers.BigNumber.from("4800000000000"),
            maxPriorityFeePerGas: ethers.BigNumber.from("4500000000000")
        }
    );
    delete unsigned.from;
    unsigned.chainId = 27;
    unsigned.type = 2;
    const raw = await wallet.signTransaction(unsigned);
    const parsed = ethers.utils.parseTransaction(raw);
    assert.equal(parsed.from, wallet.address);
    assert.equal(parsed.nonce, 12847);
    assert.equal(parsed.chainId, 27);
    assert.equal(parsed.type, 2);
    assert.equal(parsed.to, contract.address);
    assert.equal(parsed.hash, ethers.utils.keccak256(raw));
});
