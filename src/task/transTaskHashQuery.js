const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const {updateTransFormList, findTransFormListAll} = require("../Orm/TransFormListService");
const {web3, getWeb3} = require("./taskConst");
const betchHashQueryFlag = "betchHashQuery_START";
let nextOffset = 0;

async function getReceiptsBatch(hashes, _web3) {
    const batch = new _web3.BatchRequest();
    const promises = hashes.map(hash =>
        new Promise((resolve, reject) => {
            batch.add(_web3.eth.getTransactionReceipt.request(hash, (err, receipt) => {
                if (err) reject(err);
                else resolve({hash, receipt});
            }));
        })
    );
    batch.execute();
    return Promise.all(promises);
}

async function betchHashQuery() {
    if (await getString(betchHashQueryFlag) == "1") {
        console.log('===================wait start betchHashQuery')
        return
    } else {
        await setString(betchHashQueryFlag, "1", 60)
        console.time("betchHashQuery")
        try {
            let transList_ret = await findTransFormListAll(_param = {
                where: {
                    t_status: 5
                },
                order: [["id", "ASC"]],
                offset: nextOffset,
                limit: 15,
            })

            if (transList_ret.err) {
                console.trace("ERR:", transList_ret.err);
                return;
            }
            // A pending transaction may remain in status 5 for a long time.
            // Rotate through the result set so it cannot hide newer receipts.
            nextOffset = transList_ret.result.length === 0 ? 0 : nextOffset + 15;
            let currTime = new Date().getTime();
            const transList = transList_ret.result.filter(tx => {
                const timeDiff = currTime - tx.update_time.getTime();
                return timeDiff >= 10000 && tx.hash && tx.hash != "" && tx.hash != null;
            });

            const hashes = transList.map(tx => tx.hash);
            const _web3 = getWeb3();
            const results = await getReceiptsBatch(hashes, _web3);
            let updates = [];
            for (const [idx, {hash, receipt}] of results.entries()) {
                // if (!receipt) return;

                if (receipt != null) {
                    let t_statusStorage = receipt.status === true ? 6 : 1;
                    console.log("currTime - transList[idx].update_time.getTime():", currTime - transList[idx].update_time.getTime())
                    if (t_statusStorage === 1 && currTime - transList[idx].update_time.getTime() >= 30000) {
                        updates.push({id: transList[idx].id, t_status: t_statusStorage, originalHash: hash});
                    } else if (t_statusStorage !== 1) {
                        updates.push({id: transList[idx].id, t_status: t_statusStorage, originalHash: hash});
                    }
                } else if (currTime - transList[idx].update_time.getTime() >= 5 * 60 * 1000) {
                    // No receipt does not mean the transaction was dropped. It may still
                    // be pending or queued, so keep its order out of the send loop.
                    const transaction = await _web3.eth.getTransaction(hash);
                    if (transaction) continue;
                    const nonce = Number(transList[idx].nonce);
                    if (!Number.isSafeInteger(nonce) || nonce < 0) continue;
                    const latestNonce = await _web3.eth.getTransactionCount(transList[idx].t_from, "latest");
                    if (Number(latestNonce) <= nonce) {
                        updates.push({id: transList[idx].id, t_status: 1, originalHash: hash});
                    } else {
                        console.trace("Transaction receipt missing after nonce was consumed:", hash);
                    }
                }
            }
            await Promise.all(updates.map(update => updateTransFormList(
                {t_status: update.t_status},
                {id: update.id, t_status: 5, hash: update.originalHash}
            )));

        } catch (error) {
            console.trace(error);
        } finally {
            await removeString(betchHashQueryFlag);
            console.timeEnd("betchHashQuery");
        }
    }
}

// betchHashQuery()
module.exports = {
    betchHashQuery
};
