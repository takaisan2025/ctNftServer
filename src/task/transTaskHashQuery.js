const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require("../redis/redis-client");
const {updateTransFormList, findTransFormListAll} = require("../Orm/TransFormListService");
const {web3} = require("./taskConst");
const betchHashQueryFlag = "betchHashQuery_START";

async function betchHashQuery() {
    if (await getString(betchHashQueryFlag) == "1") {
        console.log('===================wait start betchHashQuery')
        return
    } else {
        await setString(betchHashQueryFlag, "1", 60)
        console.time("betchHashQuery")

        let transList_ret = await findTransFormListAll(_param = {
            where: {
                t_status: 5
            },
            offset: 0,
            limit: 500,
        })

        let transList = []
        if (transList_ret.err != null) {
            console.trace("ERR:", transList_ret.err);
        }
        transList = transList_ret.result
        for (let retKey in transList) {
            // console.log(transList[retKey]);
            const {
                id,
                update_time,
                hash
            } = transList[retKey];
            if (!hash || hash == "" || hash == null) {
                continue;
            }
            try {


                let recept = await web3.eth.getTransactionReceipt(hash);
                let currTime = new Date().getTime();
                if (currTime - update_time.getTime() < 10000) {   // hash产生不到10s自动跳过
                    continue;
                } else {
                    let t_statusStorage;
                    if (recept != null && recept.status == true) {
                        t_statusStorage = 6;
                    } else {

                        // 操作还没完成，需要等待挖矿   这里默认都会成功,跳过挖矿
                        // save db
                        // if (recept.data.transaction == null || recept.data.transaction.status == null) {
                        if (currTime - update_time.getTime() < 60000) {
                            continue;
                        } else {
                            t_statusStorage = 1;
                            console.log("查询hash结果false,", hash);
                        }
                    }
                    let trans_from_obj = {
                        t_status: t_statusStorage, // 6 成功,7 失败
                    };

                    console.log("nftUpdateSelective:", {id, hash}, trans_from_obj);
                    await updateTransFormList(trans_from_obj, {id: id})
                }
            } catch (e) {
                console.trace(e)
                continue;
            }

        }
        await removeString(betchHashQueryFlag)
        console.timeEnd("betchHashQuery");

    }
}

// betchHashQuery()
module.exports = {
    betchHashQuery
};
