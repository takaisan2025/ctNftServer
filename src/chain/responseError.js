
const {responseFun, responseFunStr} = require("../mapper/account");
const RESPONSE_STATUS = {
    SUCCESS: 200,
    ERROR: 500,
};
let PasswordError = responseFun(RESPONSE_STATUS.ERROR, "invalid password", {})
let PasswordEmpty = responseFun(RESPONSE_STATUS.ERROR, "password 不能为空!", {})

module.exports = {
    PasswordError,
    PasswordEmpty,
    RESPONSE_STATUS
};
