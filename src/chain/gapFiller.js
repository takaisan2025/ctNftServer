"use strict";

const ethers = require("ethers");
const {sendAtPendingNonce} = require("./signedOrderSender");
const {TRANSFER_MAX_FEE_PER_GAS} = require("./gasFunding");

async function fillNonceGap({locks, provider, wallet, nonce, hasReservation, persist}) {
    const address = wallet.address;
    return sendAtPendingNonce({
        locks, provider, address, expectedNonce: nonce, hasReservation,
        send: async currentNonce => {
            const network = await provider.getNetwork();
            if (network.chainId !== 27) throw new Error("Unexpected chainId for nonce gap fill");
            // Repeated attempts sign identical bytes. An uncertain RPC result
            // cannot create a second business transaction or a new hash.
            const raw = await wallet.signTransaction({
                chainId: 27,
                type: 2,
                nonce: currentNonce,
                to: address,
                value: 0,
                gasLimit: 21000,
                maxFeePerGas: TRANSFER_MAX_FEE_PER_GAS,
                maxPriorityFeePerGas: ethers.BigNumber.from("4500000000000")
            });
            const hash = ethers.utils.keccak256(raw);
            if (persist) await persist({nonce: currentNonce, hash});
            const sent = await provider.sendTransaction(raw);
            if (sent.hash.toLowerCase() !== hash.toLowerCase()) {
                throw new Error("Gap fill broadcast hash differs from signed transaction");
            }
            return sent;
        }
    });
}

module.exports = {fillNonceGap};
