const {isEmpty} = require("../rules/rules");
const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require('./redis-client');
// console.log(setString("aa",10).then(r=>console.log(r)))
// console.log(setString("aa",10,10).then(r=>console.log(r)))
// console.log(getString("aa").then(r=>console.log(r)))
console.log(getString("WALLET_ACCOUNT_" + "0x39a1E670db3F586122150067F79937716Dd48230").then(r => {
    console.log(isEmpty(r))
}))
