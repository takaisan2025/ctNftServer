const {responseFun, responseFunStr} = require("../mapper/account");

let PasswordError = JSON.parse(responseFunStr(500, {message: "invalid password"}, {}))
let PasswordEmpty = JSON.parse(responseFunStr(500, {message: "password 不能为空!"}, {}))

module.exports = {
    PasswordError,
    PasswordEmpty
};
