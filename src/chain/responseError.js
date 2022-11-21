const {responseFun, responseFunStr} = require("../mapper/account");
const RESPONSE_STATUS = {
    SUCCESS: 200,
    ERROR: 500,
};
let PasswordError = JSON.parse(responseFunStr(500, "invalid password", {}))
let PasswordEmpty = JSON.parse(responseFunStr(500, "password 不能为空!", {}))

module.exports = {
    PasswordError,
    PasswordEmpty,
    RESPONSE_STATUS
};
