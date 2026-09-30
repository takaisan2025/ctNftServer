"use strict";

const {Op} = require("sequelize");
const {findTransFormListAll} = require("../Orm/TransFormListService");
const {getString, removeString} = require("../redis/redis-client");
const {customHttpProvider} = require("../task/taskConst");

async function hasReservedTransferNonce(address, nonce, ignoreId, ignoreGapFill = false) {
    if (!ignoreGapFill) {
        const key = `GAP_FILL:${address.toLowerCase()}`;
        const raw = await getString(key);
        if (raw) {
            const gap = JSON.parse(raw);
            const gapNonce = Number(gap.nonce);
            if (!Number.isSafeInteger(gapNonce) || gapNonce < 0) {
                throw new Error(`Invalid gap fill journal: ${key}`);
            }
            const latest = await customHttpProvider.getTransactionCount(address, "latest");
            if (latest <= gapNonce) return true;
            await removeString(key);
        }
    }
    // Send only one transfer per account at a time. A later pending nonce can
    // disappear when the account cannot cover several gas ceilings together.
    const inFlightWhere = {
        t_from: address,
        hash: {[Op.ne]: null},
        t_status: 5
    };
    if (ignoreId != null) inFlightWhere.id = {[Op.ne]: ignoreId};
    const inFlight = await findTransFormListAll({where: inFlightWhere, limit: 1});
    if (inFlight.err) throw inFlight.err;
    if (inFlight.result.length > 0) return true;

    const where = {
        t_from: address,
        nonce: String(nonce),
        hash: {[Op.ne]: null},
        t_status: 1
    };
    if (ignoreId != null) where.id = {[Op.ne]: ignoreId};
    const result = await findTransFormListAll({where, limit: 1});
    if (result.err) throw result.err;
    return result.result.length > 0;
}

module.exports = {hasReservedTransferNonce};
