const {betchCallFundUtils} = require("./transTaskReCallUtils");
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
async function betchCallFund() {
    await betchCallFundUtils(
        "betchCallFund",
        8,
        "selectByStatusAndLimit",
        {t_status: 6}
    );
}

module.exports = {
    betchCallFund
};
