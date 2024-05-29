const {isEmpty} = require("../rules/rules");
const {
    getString,
    setString,
    removeString,
    rpush,
    pttl,
    lrange,
    lrem, getKeys,
} = require('./redis-client');
const redisClient = require('./redis')

async function main() {
    // console.log(setString("aa",10).then(r=>console.log(r)))
    // console.log(await setString("aa", 10, 10))
    // console.log(await getString("aa").then(r => r))
    // console.log(await getString("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r => console.log(r)))
    // console.log(await pttl("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r => console.log(r)))
    console.log(setString("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F","1", 300).then(r=>console.log(r)))
    // console.log(getKeys("BALANCE_*",).then(r => {
    //     for (let rElement of r) {
    //         console.log(r)
    //         console.log(rElement.split('ALANCE_')[1])
    //     }
    //
    // }))
    // console.log(getString("BALANCE_0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F",).then(r=>console.log(r)))
    // console.log(rpush("BAAA","0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r=>console.log(r)))
    // console.log(lrange("BAAA",).then(r=>console.log(r)))
    // console.log(lrem("BAAA",100, "0xCC8c455C4A19e6DF29dbBe9659cf84EC1A13589F").then(r => console.log(r)))
}

main()
