const web3 = require("web3");
let web3o = new web3("http://ctblock.cn/blockChain");

function isJson(obj) {
    var is_json = typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
    return is_json;
}

function stripHexPrefix(address) {
    return web3o.utils.stripHexPrefix(address)
}
module.exports = {
    isJson,
    stripHexPrefix
};
