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


async function getReceiptsBatch(hashes) {
    let _web3 = getWeb3()
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
                offset: 0,
                limit: 10,
            })

            if (transList_ret.err != null) {
                console.trace("ERR:", transList_ret.err);
            }

            const transList = transList_ret.result.filter(tx => {
                const timeDiff = new Date().getTime() - tx.update_time.getTime();
                return timeDiff >= 10000 && timeDiff >= 60000;
            });

            const hashes = transList.map(tx => tx.hash);
            console.log("hashes:", hashes)
            const results = await getReceiptsBatch(hashes);

            let updates = [];
            results.forEach(({hash, receipt}, idx) => {
                if (!receipt) return;

                let t_statusStorage = receipt.status ? 6 : 1;
                updates.push({id: transList[idx].id, t_status: t_statusStorage});
            });
            console.log(updates)
            await Promise.all(updates.map(update => updateTransFormList(update, {id: update.id})));

        } catch (error) {
            console.trace(error);
        } finally {
            await setString(betchHashQueryFlag, "1", 3)
            console.timeEnd("betchHashQuery");
        }
    }
}

// betchHashQuery()
module.exports = {
    betchHashQuery
};
