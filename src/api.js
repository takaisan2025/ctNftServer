// SPDX-License-Identifier: BUSL-1.1
const {ethers} = require("ethers");
const fetch = require("isomorphic-fetch");
const {EventEmitter} = require("events");
const {zksyncOrderSchema} = require("./schemas");
const {WebSocket} = require("ws");
const fs = require("fs");
const services = require("./services");
const {
    formatPrice,
    getERC20Info,
    getNetwork,
    getNewToken,
    getRPCURL,
} = require("./utils");

class API extends EventEmitter {
    USER_CONNECTIONS = {};
    MAKER_CONNECTIONS = {};
    SYNC_PROVIDER = {};
    ETHERS_PROVIDERS = {};
    STARKNET_EXCHANGE = {};
    MARKET_MAKER_TIMEOUT = 300;
    VALID_CHAINS = process.env.VALID_CHAINS
        ? JSON.parse(process.env.VALID_CHAINS)
        : [1, 583, 1002, 1001, 42161, 421613];
    VALID_CHAINS_ZKSYNC = this.VALID_CHAINS.filter((chainId) =>
        [1, 583, 1002].includes(chainId)
    );
    started = false;
    wss;
    http;
    db;

    constructor(wss, db, http) {
        super();
        this.db = db;
        this.http = http;
        this.wss = wss;
        this.http.api = this;
        this.wss.api = this;
    }

    serviceHandler = (msg, ws) => {
        if (msg.op === "ping") {
            return false;
        }
        if (!Object.prototype.hasOwnProperty.call(services, msg.op)) {
            console.error(`Operation failed: ${msg.op}`);
            return false;
        }
        try {
            return services[msg.op].apply(this, [
                this,
                ws,
                Array.isArray(msg.args) ? msg.args : [],
            ]);
        } catch (e) {
            console.error(`Operation failed: ${msg.op} because ${e.message}`);
            return false;
        }
    };

    start = async (port) => {
        if (this.started) return;
        this.started = true;

        this.http.listen(port, () => {
            console.log(`Server listening on port ${port}.`);
        });
    };

    stop = async () => {
        if (!this.started) return;
        this.started = false;
    };

    /**
     * Get default market info from Arweave
     * @param market market alias or marketId
     * @returns
     */
    getDefaultValuesFromArweave = async (chainId, market) => {
        let marketInfo = null;
        let marketArweaveId;
        try {
            // get marketArweaveId
            if (market.length > 19) {
                marketArweaveId = market;
            } else {
                const select = await this.db.query(
                    "SELECT marketid FROM marketids WHERE marketAlias = $1 AND chainid = $2",
                    [market, chainId]
                );
                if (select.rows.length === 0) {
                    return marketInfo;
                }
                marketArweaveId = select.rows[0].marketid;
            }

            // get arweave default marketinfo
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000);

            console.log(
                `Arweave request ${`https://arweave.net/${marketArweaveId}`}`
            );
            const fetchResult = await fetch(
                `https://arweave.net/${marketArweaveId}`,
                {
                    signal: controller.signal,
                }
            ).then((r) => r.json());
            console.log(`Arweave result: ${fetchResult}`);

            if (!fetchResult) return marketInfo;
            marketInfo = fetchResult;
        } catch (err) {
            console.error(
                `Can't fetch update default marketInfo for ${market}, Error ${err.message}`
            );
        }
        return marketInfo;
    };

    updateMatchedOrder = async (chainId, orderid, newstatus, txhash) => {
        chainId = Number(chainId);
        orderid = Number(orderid);
        let update;
        let fillId;
        let market;
        const values = [newstatus, txhash, chainId, orderid];
        try {
            update = await this.db.query(
                "UPDATE offers SET order_status=$1, txhash=$2, update_timestamp=NOW() WHERE chainid=$3 AND id=$4 AND order_status='m' RETURNING userid",
                values
            );
        } catch (e) {
            console.error("Error while updateMatchedOrder offers.");
            console.error(e);
            return false;
        }

        try {
            const update2 = await this.db.query(
                "UPDATE fills SET fill_status=$1, txhash=$2 WHERE chainid=$3 AND taker_offer_id=$4 RETURNING id, market",
                values
            );
            if (update2.rows.length > 0) {
                fillId = update2.rows[0].id;
                market = update2.rows[0].market;
            }
        } catch (e) {
            console.error("Error while updateMatchedOrder fills.");
            console.error(e);
            return false;
        }

        return {success: update.rowCount > 0, fillId, market};
    };

    cancelorder2 = async (chainId, orderId, signature) => {
        const values = [orderId, chainId];
        const select = await this.db.query(
            "SELECT userid, order_status FROM offers WHERE id=$1 AND chainid=$2",
            values
        );

        if (select.rows.length === 0) {
            throw new Error("Order not found");
        }

        if (!["o", "pf", "pm"].includes(select.rows[0].order_status)) {
            throw new Error("Order is no longer open");
        }

        const updatevalues = [orderId];
        const update = await this.db.query(
            "UPDATE offers SET order_status='c', zktx=NULL, update_timestamp=NOW(), unfilled=0 WHERE id=$1 RETURNING market",
            updatevalues
        );

        if (update.rows.length > 0) {
            await this.redisPublisher.publish(
                `broadcastmsg:all:${chainId}:${update.rows[0].market}`,
                JSON.stringify({
                    op: "orderstatus",
                    args: [[[chainId, orderId, "c", null, 0]]],
                })
            );
        } else {
            throw new Error("Order not found");
        }

        return true;
    };

    getopenorders = async (chainId, market) => {
        chainId = Number(chainId);
        const query = {
            text: "SELECT chainid,id,market,side,price,base_quantity,quote_quantity,expires,userid,order_status,unfilled,txhash FROM offers WHERE market=$1 AND chainid=$2 AND order_status='o'",
            values: [market, chainId],
            rowMode: "array",
        };
        const select = await this.db.query(query);
        return select.rows;
    };

    getOrder = async (chainId, orderId) => {
        chainId = Number(chainId);
        orderId = typeof orderId === "string" ? [orderId] : orderId;
        const query = {
            text: "SELECT chainid,id,market,side,price,base_quantity,quote_quantity,expires,userid,order_status,unfilled,txhash FROM offers WHERE chainid=$1 AND id IN ($2) LIMIT 25",
            values: [chainId, orderId],
            rowMode: "array",
        };
        const select = await this.db.query(query);

        if (select.rows.length === 0) throw new Error("Order not found");
        return select.rows;
    };

    getFill = async (chainId, orderId) => {
        chainId = Number(chainId);
        orderId = typeof orderId === "string" ? [orderId] : orderId;
        const query = {
            text: "SELECT chainid,id,market,side,price,amount,fill_status,txhash,taker_user_id,maker_user_id,feeamount,feetoken,insert_timestamp FROM fills WHERE chainid=$1 AND id IN ($2) LIMIT 25",
            values: [chainId, orderId],
            rowMode: "array",
        };
        const select = await this.db.query(query);
        if (select.rows.length === 0) throw new Error("Fill(s) not found");
        return select.rows;
    };

    getuserfills = async (chainId, userid) => {
        chainId = Number(chainId);
        const query = {
            text: "SELECT chainid,id,market,side,price,amount,fill_status,txhash,taker_user_id,maker_user_id,feeamount,feetoken,insert_timestamp FROM fills WHERE chainid=$1 AND (maker_user_id=$2 OR taker_user_id=$2) ORDER BY id DESC LIMIT 25",
            values: [chainId, userid],
            rowMode: "array",
        };
        const select = await this.db.query(query);
        return select.rows;
    };

    getuserorders = async (chainId, userid) => {
        const query = {
            text: "SELECT chainid,id,market,side,price,base_quantity,quote_quantity,expires,userid,order_status,unfilled,txhash FROM offers WHERE chainid=$1 AND userid=$2 AND order_status IN ('o','pm','pf') ORDER BY id DESC LIMIT 25",
            values: [chainId, userid],
            rowMode: "array",
        };
        const select = await this.db.query(query);
        return select.rows;
    };

    /**
     * Returns fills for a given market.
     * @param {number} chainId reqested chain (1->zkSync, 1002->zkSync_goerli)
     * @param {PerpMarket} market reqested market
     * @param {number} limit number of trades returnd (MAX 25)
     * @param {number} orderId orderId to start at
     * @param {number} type side of returned fills 's', 'b', 'buy' or 'sell'
     * @param {number} startTime time for first fill
     * @param {number} endTime time for last fill
     * @param {number} accountId accountId to search for (maker or taker)
     * @param {string} direction used to set ASC or DESC ('older' or 'newer')
     * @return {number} array of fills [[chainId,id,market,side,price,amount,fill_status,txhash,taker_user_id,maker_user_id,feeamount,feetoken,insert_timestamp],...]
     */
    getfills = async (
        chainId,
        market,
        limit,
        orderId,
        type,
        startTime,
        endTime,
        accountId,
        direction
    ) => {
        let text =
            "SELECT chainid,id,market,side,price,amount,fill_status,txhash,taker_user_id,maker_user_id,feeamount,feetoken,insert_timestamp FROM fills WHERE chainid=$1 AND fill_status='f'";

        if (market) {
            text += `
 AND market = '$
{
    market
}
'
`;
        }

        let sqlDirection = "DESC";
        if (direction) {
            if (direction === "older") {
                sqlDirection = "DESC";
            } else if (direction === "newer") {
                sqlDirection = "ASC";
            } else {
                throw new Error("Only direction 'older' or 'newer' is allowed.");
            }
        }

        if (orderId) {
            if (sqlDirection === "DESC") {
                text += `
 AND id <= '$
{
    orderId
}
'
`;
            } else {
                text += `
 AND id >= '$
{
    orderId
}
'
`;
            }
        }

        if (type) {
            let side;
            switch (type) {
                case "s":
                    side = "s";
                    break;
                case "b":
                    side = "b";
                    break;
                case "sell":
                    side = "s";
                    break;
                case "buy":
                    side = "b";
                    break;
                default:
                    throw new Error("Only type 's', 'b', 'sell' or 'buy' is allowed.");
            }
            text += `
 AND side = '$
{
    side
}
'
`;
        }

        if (startTime) {
            const date = new Date(startTime).toISOString();
            text += `
 AND insert_timestamp >= '$
{
    date
}
'
`;
        }

        if (endTime) {
            const date = new Date(endTime).toISOString();
            text += `
 AND insert_timestamp <= '$
{
    date
}
'
`;
        }

        if (accountId) {
            text += `
 AND (maker_user_id='$
{
    accountId
}
' OR taker_user_id='$
{
    accountId
}
')
`;
        }

        limit = limit ? Math.min(50, Number(limit)) : 50;
        text += `
 ORDER BY id $
{
    sqlDirection
}
 LIMIT $
{
    limit
}
`;

        try {
            const query = {
                text,
                values: [chainId],
                rowMode: "array",
            };
            const select = await this.db.query(query);
            return select.rows;
        } catch (e) {
            console.log(`
Error in getFills: $
{
    text
}
, Error: $
{
    e.message
}
`);
            return [];
        }
    };

}

module.exports = API;
