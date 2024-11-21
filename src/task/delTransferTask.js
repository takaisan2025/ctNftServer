const {
    getString, setString, removeString, rpush, lrange, lrem,
} = require("../redis/redis-client");
const {updateTransFormList, findTransFormListAll, delTransById} = require("../Orm/TransFormListService");
const {apolloClient} = require("../apollo");
const {TransferDocument} = require("../generated/graphql");
const delTransferFlag = "delTransfer_START";
const ethUtil = require("ethereumjs-util");
const {RESPONSE_STATUS} = require("../chain/responseError");
const {responseFun} = require("../mapper/account");

async function getReceiptsBatch(orderId) {
    let orderIdEcc = `0x${ethUtil
        .keccak256(Buffer.from(orderId))
        .toString("hex")}`;

    let transData = await apolloClient().query({
        query: TransferDocument,
        variables: {id: orderIdEcc}
    })
        .then(response => {
            return {
                'data': response.data
            }
        })
        .catch(error => {
            return {
                'err': error
            }
        });
    return transData;
}

const {Op} = require('sequelize')

async function delTransfer() {
    if (await getString(delTransferFlag) == "1") {
        console.log('===================wait start delTransfer')
        return
    } else {
        await setString(delTransferFlag, "1", 60)
        console.time("delTransfer")
        try {
            // 查询id大于这个的数据
            // 4597267
            let transList_ret = await findTransFormListAll(_param = {
                where: {
                    t_status: 4,
                    id: {
                        // [Op.gte]: 4597268
                        [Op.gte]: 134484
                    }
                }, offset: 0, limit: 15,
            })

            if (transList_ret.err) {
                console.trace("ERR:", transList_ret.err);
                return;
            }
            let currTime = new Date().getTime();
            const transList = transList_ret.result.filter(tx => {
                const timeDiff = currTime - tx.create_time.getTime();
                return timeDiff >= 60000 * 60 * 24 * 30;   // 30 天
            });
            for (let i = 0; i < transList.length; i++) {
                let tx = transList[i]
                const transData = await getReceiptsBatch(tx.orderId);
                if (transData.err == undefined) {
                    if (transData.data && Array.isArray(transData.data.transfers) == true && transData.data.transfers.length > 0) {
                        console.log("子图数据查询：", transData.data.transfer.blockNumber)
                        // TODO 如果子图存在数据 这里删除数据
                        console.log('删除数据ID:', tx.id)
                        let delResult = await delTransById(tx.id)
                        console.log("删除数据结果：", delResult)
                    } else {
                        console.log("子图数据查询结构为空：id:", tx.id)
                    }
                }
            }
        } catch (error) {
            console.trace(error);
        } finally {
            await removeString(delTransferFlag);
            console.timeEnd("delTransfer");
        }
    }
}

delTransfer()
module.exports = {
    delTransfer
};
