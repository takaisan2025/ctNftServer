const {
    getString,
    setString,
    removeString,
} = require("../redis/redis-client");

async function testFun() {
    if (await getString('TEST_testFun') == "1") {
        console.log('wait start')
        return
    } else {
        console.log('start')
        console.log(new Date())
        console.log(1)
        await setString('TEST_testFun', "1", 60)
        await setTimeout(async () => {
            console.log(2)
            console.log('end')
            await removeString('TEST_testFun')
        }, 800)
    }
}

function main() {
    setInterval(testFun, 500)
}

main()
