const {
    queryBalance
} = require("./balanceQuery.js")

async function main() {
    let balance = await queryBalance("0x21366db44c5c6aebe8fe6005b3f599e561100740")
    console.log(balance)
}

main().then(r => console.log(r)).catch(e => console.log(e))
