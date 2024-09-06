const Web3 = require("web3");

function isJson(obj) {
    var is_json = (typeof (obj) == "object") &&
        (Object.prototype.toString.call(obj).toLowerCase() == "[object object]")
        && !obj.length
    ;
    if (!is_json) {
        return {err: "invalid paramter data", flag: false}
    } else {
        return {err: null, flag: true}
    }
}

function checkURL(URL) {
    var str = URL;
//判断URL地址的正则表达式为:http(s)?://([\w-]+\.)+[\w-]+(/[\w- ./?%&=]*)?
//下面的代码中应用了转义字符"\"输出一个字符"/"
//     var Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
    var Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
    var objExp = new RegExp(Expression);
    if (!objExp.test(str)) {
        return {err: "url参数无效", flag: false}
    } else {
        return {err: null, flag: true}
    }
}

function validateOederid(orderId) {
    let ret = Web3.utils.isAddress("0x3059e2b513893A3241b7A750B8aA48ed4bC9FFAA")
    const regex = /^(0x)?([0-9a-fA-F]{40})$/;
    if (address === "" || !regex.test(address)) {
        return {err: "地址格式错误", flag: false}
    } else {
        return {err: null, flag: true};
    }
}

function validateAddress(address) {
    let isAddress = Web3.utils.isAddress(address)
    if (!isAddress) {
        return {err: "地址格式错误", flag: false}
    } else {
        return {err: null, flag: isAddress};
    }
}

function validateAddressBalanceEnough(address) {
    let isAddress = Web3.utils.isAddress(address)
    if (!isAddress) {
        return {err: "地址格式错误", flag: false}
    } else {
        return {err: null, flag: true};
    }
}

function isEmpty(value) {

    if (!value || value == "" || value == null || value.trim() == "") {
        return true
    } else {
        return false
    }
}

module.exports = {
    isJson,
    validateAddress,
    validateAddressBalanceEnough,
    checkURL,
    isEmpty
};
