const {betchCallFundUtils} = require("./transTaskReCallUtils");
const {formatTime} = require("./taskConst");
const {Op} = require('sequelize')

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

async function betchCallByTime() {

    let dataStr = formatTime(new Date(new Date() - (6 * 60 * 60 * 1000)))  // 当前时间前六小时
    await betchCallFundUtils(
        "betchCallByTime",
        18,
        "selectByStatusAndCreateTime",
        {
            t_status: 18, create_time: {
                [Op.gte]: dataStr
            }
        }
    );

}

module.exports = {
    betchCallByTime
};
// node src\task\transTaskReCallByTime.js
