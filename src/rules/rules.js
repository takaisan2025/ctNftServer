const web3 = require("web3");
let web3o = new web3("http://ctblock.cn/blockChain");

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

function stripHexPrefix(address) {
    return web3o.utils.stripHexPrefix(address)
}

function validateAddress(address) {
    const regex = /^(0x[0-9a-fA-F]{40})$/;
    if (address === "" || !regex.test(address)) {
        return {err: "地址格式错误", flag: false}
    } else {
        return {err: null, flag: true};
    }
}

function validateAddressBalanceEnough(address) {
    const regex = /^(草田分余额不足: 0x[0-9a-fA-F]{40})$/;
    if (address === "" || !regex.test(address)) {
        return {err: "草田分余额不足地址格式错误", flag: false}
    } else {
        return {err: null, flag: true};
    }
}

function isEmpty(value) {

    if (!value || value == "" || value == null || value.trim() == "") {
        return {err: null, flag: true}
    } else {
        return {err: "参数为空", flag: false};
    }
}

module.exports = {
    isJson,
    stripHexPrefix,
    validateAddress,
    validateAddressBalanceEnough,
    checkURL,
    isEmpty
};
