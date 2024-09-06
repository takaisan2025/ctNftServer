"use strict";
const fetch = require("node-fetch");
const {RESPONSE_STATUS} = require("../chain/responseError");
// 接口前缀
const API_PREFIX = "https://api.ctblock.cn/"
// 十组
let contractDate = [
    {"name": "稀世珍藏", "symbol": "Rare Collection"},
    {"name": "独一无二", "symbol": "Unique"},
    {"name": "数字艺术", "symbol": "Digital Art"},
    {"name": "链上资产", "symbol": "On-Chain Asset"},
    {"name": "元宇宙收藏", "symbol": "Metaverse Collectible"},

    {"name": "永恒珍品", "symbol": "Eternal Treasure"},
    {"name": "无与伦比", "symbol": "Unparalleled"},
    {"name": "数字瑰宝", "symbol": "Digital Gem"},
    {"name": "区块链资产", "symbol": "Blockchain Asset"},
    {"name": "虚拟世界藏品", "symbol": "Virtual World Collectible"}
]

let opAccount = [
    {
        address: "0xEcafe3356B305Ea211E0Ae1aA0b8e7E00b187eD4",
        password: "1234567890",
        contract: "0xb5B8D2A9e06e14E9586F88C5c53D5d1AF134023F",
        tokenId: "0xEcafe3356B305Ea211E0Ae1aA0b8e7E00b187eD4c12345678901711167969595",
    },
    {
        address: "0xC5a913BABbAaC581AdEd9453df0Df96b263EA8B2",
        password: "1234567890",
        contract: "0xD1f56a8064102Ee6Ec45Fa624f11B16863960739",
        tokenId: "0xC5a913BABbAaC581AdEd9453df0Df96b263EA8B2c12345678901711168010859"
    },
    {
        address: "0x159Ea8A62C4f23369467a858e75a7F39c6819077",
        password: "1234567890",
        contract: "0x6eC18f0C1C4C6780ff3723E69137511fe324c98b",
        tokenId: "0x159Ea8A62C4f23369467a858e75a7F39c6819077c12345678901711168018705"
    },
    {
        // 1
        address: "0x0DC66883d0B3d9C1C469ef01D50B284aFa179879",
        password: "1234567890",
        contract: "0x9BbF7e79De3f1115B6FD46744F8ed833bE710Af1",
        tokenId: "0x0DC66883d0B3d9C1C469ef01D50B284aFa179879c12345678901711168031116"
    },
    {
        address: "0xEA501705Fdf47B4d19aa6816eaa60D773f626595",
        password: "1234567890",
        contract: "0x5e55deC69C46477A6ac602e22245c4D733934454",
        tokenId: "0xEA501705Fdf47B4d19aa6816eaa60D773f626595c12345678901711168041353"
    },

    {
        address: "0x904422B3D0609F27CA19Eb6c42DD0e07ea3d4587",
        password: "1234567890",
        contract: "0xCBC9D0F3D0278F316ca3d8f94198190a7Fb0223d",
        tokenId: "0x904422B3D0609F27CA19Eb6c42DD0e07ea3d4587c12345678901711168050148"
    },
    {
        address: "0x889437671bf57C61848363f932760B74b86AEA88",
        password: "1234567890",
        contract: "0x4e8149d28ef46E321b75BC9570c1B90960c683D5",
        tokenId: "0x889437671bf57C61848363f932760B74b86AEA88c12345678901711168062647"
    },
    {
        address: "0x5589549Bb62F357ffe408FFE54590103cF2289Cb",
        password: "1234567890",
        contract: "0xf25Ce7d6b8D7aB4367372449F7f6423FD9Cfa2E1",
        tokenId: "0x5589549Bb62F357ffe408FFE54590103cF2289Cbc12345678901711168070536"
    },
    {
        address: "0xB65B919A7ADD0D5Cca58f0bD7b877e6BfE6A4005",
        password: "1234567890",
        contract: "0xc1aa87F6C4C1e7C77906EE950D3dd77AB71C035C",
        tokenId: "0xB65B919A7ADD0D5Cca58f0bD7b877e6BfE6A4005c12345678901711168080207"
    },
    {
        address: "0x6c89FfD5859C0972782949bEe8753dfD535EafbF",
        password: "1234567890",
        contract: "0xe6b0D5D2B385505c8a3231fba099212dcae77843",
        tokenId: "0x6c89FfD5859C0972782949bEe8753dfD535EafbFc12345678901711168091405"
    },
]

let auths = [
    {
        "author": "星尘漫步者",
        "description": "一位来自遥远星系的旅者，在宇宙中漂泊了数千年，以记录宇宙的奇观和奥秘为己任。",
        "work": "《星尘漫步者的笔记》： 一部游记，记录了作者在宇宙中旅行的见闻，包括奇异的星球、神秘的文明和难以想象的生物。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG4.jpg",
        "title": "星尘漫步者的笔记"
    },
    {
        "author": "深海潜行者",
        "description": "一位海洋生物学家，致力于探索海洋的深处，揭开海洋的秘密。",
        "work": "《深海之声》： 一部科幻小说，讲述了作者在一次深海探险中发现了一种神秘的生物，并由此揭开了一个惊人的秘密。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1 (5).jpg",
        "title": "深海之声"
    },
    {
        "author": "时间旅人",
        "description": "一位拥有穿越时空能力的人，游历于不同的历史时期，见证了人类文明的兴衰变迁。",
        "work": "《时间的回声》： 一部历史小说，讲述了作者穿越时空，与不同历史时期的人物相遇的故事。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1.gjBqOnOewd1CvNrZC.jpg",
        "title": "时间的回声"
    },
    {
        "author": "梦境编织者",
        "description": "一位拥有奇特能力的人，可以将自己的梦境编织成现实。",
        "work": "《梦境之城》： 一部奇幻小说，讲述了作者在梦境中创造了一个奇妙的世界，并在这个世界中经历了一段奇妙的冒险。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1.rbTn4Ivb_zl.jpg",
        "title": "梦境之城"
    },
    {
        "author": "代码诗人",
        "description": "一位计算机程序员，同时也是一位诗人，用代码创作诗歌，用诗歌表达对科技的思考。",
        "work": "《代码的诗歌》： 一部诗集，收录了作者用代码创作的诗歌，这些诗歌表达了作者对科技的思考和对未来的憧憬。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1 (1).jpg",
        "title": "代码的诗歌"
    },
    {
        "author": "机械之心",
        "description": "一位拥有机械心脏的人，在钢筋水泥的城市中寻找着属于自己的温暖。",
        "work": "《机械之歌》： 一部科幻小说，讲述了作者在未来世界中寻找爱情和温暖的故事。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1.jpg",
        "title": "机械之歌"
    },
    {
        "author": "灵魂画师",
        "description": "一位拥有超凡绘画技巧的人，可以用画笔描绘出灵魂的深邃。",
        "work": "《灵魂之画》： 一部艺术小说，讲述了作者用画笔描绘出不同人物的灵魂，并由此揭示了人性的复杂和深邃。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG4.jpg",
        "title": "灵魂之画"
    },
    {
        "author": "风之语者",
        "description": "一位与风交谈的人，可以聆听风的声音，感受风的故事。",
        "work": "《风之歌》： 一部散文集，收录了作者聆听风声的故事，这些故事充满了诗意和哲思。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1 (3).jpg",
        "title": "风之歌"
    },
    {
        "author": "星际探险家",
        "description": "一位勇于探索未知的人，致力于探索宇宙的奥秘，寻找地外生命。",
        "work": "《星际探险》： 一部科幻小说，讲述了作者带领团队进行星际探险，寻找地外生命的故事。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1 (1).jpg",
        "title": "星际探险"
    },
    {
        "author": "AI之子",
        "description": "一位由人工智能创造的人，拥有超越人类的智慧和能力，却在寻找自己的身份和意义。",
        "work": "《AI之子》： 一部科幻小说，讲述了作者寻找自我身份和意义的故事，探讨了人工智能与人类的关系。",
        "file": "https://raw.githubusercontent.com/qydata/image/master/OIG1 (2).jpg",
        "title": "AI之子"
    }
]


function random() {
    // 使用 `Math.floor()` 函数和 `Math.random()` 函数生成一个介于 0 到 9 之间的随机整数
    return Math.floor(Math.random() * 10) // 6
}

async function createContract1155(address, password, name, symbol) {
    return await fetch(API_PREFIX + "api/account/createctCollect", {
        method: "POST",
        redirect: "follow",
        timeout: 500000,
        body: JSON.stringify({
            "address": address,
            "password": password,
            "type": "12",
            "cMetadata": {
                "name": name,
                "symbol": symbol,
                "tokenUrlPrefix": "https://ctblock.cn/",
                "contractUrl": "https://ctblock.cn/ipfs/cat/QmZJqDPxkwGLEwocovFMpmrAKkN7nmr95LqfhcumbM9urw"
            }
        })
    }).then(resp => {
        return resp.json()
    }).then(ret => {
        return {code: RESPONSE_STATUS.ERROR, result: ret}
    })
}

async function createNft1155(address, password, contract, author, authorDesc, description, file, title) {
    return await fetch(API_PREFIX + "api/account/createctNft1155Async", {
        method: "POST",
        redirect: "follow",
        timeout: 5000,
        body: JSON.stringify({
            "address": address,
            "password": password,
            "collectAddress": contract,
            "file": file,
            "supply": 100000,
            "rebackUrl": "https://ctblock.cn/index.php?a=NftChainReturn",
            "data": {
                "author": author,
                "authorDesc": authorDesc,
                "description": description,
                "title": title,
                "toSkyDate": ""
            }
        })
    }).then(resp => {
        return resp.json()
    }).then(ret => {
        return {code: RESPONSE_STATUS.ERROR, result: ret}
    })
}

async function transferNft1155(address, password, contract, tokenid, toAddr) {
    return await fetch(API_PREFIX + "api/account/transfer_f", {
        method: "POST",
        redirect: "follow",
        timeout: 5000,
        body: JSON.stringify({
            "collectAddress": contract,
            "address": address,
            "password": password,
            "tokenId": tokenid,
            "amount": "1",
            "to": toAddr,
            "orderId": "20a2210s1612241103dd" + new Date().getTime(),
            "rebackUrl": "https://chaonft.cn/index.php?a=NftChainTransReturn"
        })
    }).then(resp => {
        return resp.json()
    }).then(ret => {
        return {code: RESPONSE_STATUS.SUCCESS, result: ret}
    }).catch(err => {
        console.trace(err)
        return {code: RESPONSE_STATUS.ERROR, result: err}
    })
}

// 生成一个5000到12000之间的随机数
function getRandomNumber() {
    let num = Math.floor(Math.random() * (12000 - 5000 + 1)) + 5000
    console.log(num)
    return num;
}

function main() {
    let ranNum = random()
    let ranNum1 = random()
    // let ranNum = 9
    let acc = opAccount[ranNum]
    let accTo = opAccount[ranNum1]
    let con = contractDate[ranNum]
    let auth = auths[ranNum]
    // 创建合约
    // createContract1155(acc.address, acc.password, con.name, con.symbol).then(r => {
    //     if (r.code) {
    //         //     出错了
    //         console.log(r.code)
    //         console.log(r.result)
    //     } else {
    //         console.log(r.result)
    //     }
    // })

    //铸造藏品
    // createNft1155(acc.address, acc.password, acc.contract, auth.author, auth.description, auth.work, auth.file, auth.title).then(r => {
    //     if (r.code && r.code === RESPONSE_STATUS.ERROR) {
    //         //     出错了
    //         console.log(r.code)
    //         console.log(r.result)
    //     } else {
    //         console.log(r.result)
    //     }
    // })

//     发送交易
    transferNft1155(acc.address, acc.password, accTo.contract, accTo.tokenId, accTo.address).then(r => {
        console.log("调用结果:", acc.address, accTo.tokenId, r.code, r.result)
        if (r.result.code == 500 && r.result.message == "手续费余额不足!") {

        }
        // setTimeout(main, getRandomNumber())
    })
    setTimeout(main, getRandomNumber())
}

setTimeout(main, getRandomNumber())
