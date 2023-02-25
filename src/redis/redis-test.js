const {isEmpty} = require("../rules/rules");
const {
    getString,
    setString,
    removeString,
    rpush,
    pttl,
    lrange,
    lrem,
} = require('./redis-client');
// console.log(setString("aa",10).then(r=>console.log(r)))
// console.log(setString("aa",10,10).then(r=>console.log(r)))
// console.log(getString("aa").then(r=>console.log(r)))
console.log(getString("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r => console.log(r)))
console.log(pttl("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r => console.log(r)))

// console.log(setString("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F","1", 300).then(r=>console.log(r)))
