"use strict";

// Call under the sender's Redis lease. Nothing is reserved until the RPC
// accepts the transaction, so a rejected send cannot leave a local gap.
async function chooseNonce(provider, address, previous = {}) {
    const oldNonce = Number(previous.nonce);
    const hasPrevious = Boolean(previous.hash) && previous.nonce != null &&
        Number.isSafeInteger(oldNonce) && oldNonce >= 0;

    if (previous.hash && !hasPrevious) {
        const receipt = await provider.getTransactionReceipt(previous.hash);
        if (receipt && Number(receipt.status) === 1) return {action: "mined-success"};
        if (receipt && Number(receipt.status) === 0) {
            return {action: "send", nonce: await provider.getTransactionCount(address, "pending")};
        }
        if (await provider.getTransaction(previous.hash)) return {action: "in-flight"};
        return {action: "unknown-nonce"};
    }

    if (hasPrevious) {
        const receipt = await provider.getTransactionReceipt(previous.hash);
        if (receipt) {
            if (Number(receipt.status) === 1) return {action: "mined-success"};
            if (Number(receipt.status) !== 0) return {action: "consumed-unknown"};
            // A reverted transaction consumed its old nonce. Rebuild the
            // same business order at the current pending nonce.
            return {action: "send", nonce: await provider.getTransactionCount(address, "pending")};
        }

        if (await provider.getTransaction(previous.hash)) return {action: "in-flight"};

        const latest = await provider.getTransactionCount(address, "latest");
        if (latest > oldNonce) return {action: "consumed-unknown"};
        const pending = await provider.getTransactionCount(address, "pending");
        if (pending < oldNonce) return {action: "earlier-gap", nonce: pending};
        if (pending > oldNonce) return {action: "nonce-occupied"};
        return {action: "send", nonce: oldNonce};
    }

    return {action: "send", nonce: await provider.getTransactionCount(address, "pending")};
}

module.exports = {chooseNonce};
