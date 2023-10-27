const {betchCallFundUtils} = require("./transTaskReCallUtils");
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
async function betchCallFund1() {

    await betchCallFundUtils(
        "betchCallFund1",
        18,
        "selectByStatus",
        {t_status: 8}
    );
}

module.exports = {
    betchCallFund1
};
