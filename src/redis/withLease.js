"use strict";

const {randomUUID} = require("node:crypto");

async function withLease(locks, key, work, options = {}) {
    const ttlMs = options.ttlMs || 60000;
    const timers = options.timers || {setInterval, clearInterval};
    const token = randomUUID();
    if (!await locks.setLock(key, token, ttlMs)) return {acquired: false};

    let held = true;
    const assertHeld = async () => {
        if (!held) throw new Error(`Redis lease lost: ${key}`);
        try {
            if (!await locks.renewLock(key, token, ttlMs)) held = false;
        } catch (_) {
            held = false;
        }
        if (!held) throw new Error(`Redis lease lost: ${key}`);
    };
    const timer = timers.setInterval(async () => {
        try {
            if (!await locks.renewLock(key, token, ttlMs)) held = false;
        } catch (_) {
            held = false;
        }
    }, Math.floor(ttlMs / 3));

    try {
        const value = await work(assertHeld);
        return {acquired: true, value};
    } finally {
        timers.clearInterval(timer);
        await locks.releaseLock(key, token);
    }
}

module.exports = {withLease};
