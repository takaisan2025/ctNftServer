const {responseFun} = require("../mapper/account");

let PasswordError = responseFun(500, {message: "invalid password"}, {})
let PasswordEmpty = responseFun(500, {message: "password 不能为空!"}, {})

module.exports = {
    PasswordError,
    PasswordEmpty
};
