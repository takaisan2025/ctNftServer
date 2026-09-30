"use strict";

const {chooseNonce} = require("./nonceManager");
const {withLease} = require("../redis/withLease");

async function submitSignedOrder({locks, provider, address, previous = {},
                                  hasReservation, prepare, sign, hashSigned,
                                  persist, broadcast}) {
    const lease = await withLease(locks, `TX_NONCE:${address.toLowerCase()}`, async assertHeld => {
        const decision = await chooseNonce(provider, address, previous);
        if (decision.action !== "send") return decision;
        if (hasReservation && await hasReservation(decision.nonce)) {
            return {action: "reserved"};
        }

        await assertHeld();
        const unsigned = await prepare(decision.nonce);
        const raw = await sign(unsigned);
        const hash = hashSigned(raw);
        await assertHeld();
        await persist({hash, nonce: decision.nonce});
        await assertHeld();
        await broadcast(raw);
        return {action: "sent", hash, nonce: decision.nonce};
    });
    return lease.acquired ? lease.value : {action: "busy"};
}

async function sendAtPendingNonce({locks, provider, address, hasReservation, expectedNonce, send}) {
    const lease = await withLease(locks, `TX_NONCE:${address.toLowerCase()}`, async assertHeld => {
        const nonce = await provider.getTransactionCount(address, "pending");
        if (expectedNonce != null && nonce !== expectedNonce) {
            return {action: "nonce-changed", nonce};
        }
        if (hasReservation && await hasReservation(nonce)) return {action: "reserved"};
        await assertHeld();
        const tx = await send(nonce);
        return {action: "sent", nonce, tx};
    });
    return lease.acquired ? lease.value : {action: "busy"};
}

module.exports = {submitSignedOrder, sendAtPendingNonce};
