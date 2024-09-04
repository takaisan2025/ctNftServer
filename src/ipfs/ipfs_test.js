"use strict";const GlobalConfig = require("../config/GlobalConfig.json");
const fs = require("fs");

let index = 1
async function main() {
    console.log(Buffer.from(GlobalConfig.IPFS[index].TOKEN).toString('base64'))
    console.time('main')
    let fileName = "C:\\Users\\Zq\\Pictures\\2023-8-7\\DSC09956.JPG"
    var data = fs.readFileSync(fileName);
    const {create} = await import('ipfs-http-client')
    const client = create({
        // timeout: 30000,
        protocol: GlobalConfig.IPFS[index].PROTOCOL,
        host: GlobalConfig.IPFS[index].HOST,
        port: GlobalConfig.IPFS[index].PORT,
        apiPath: GlobalConfig.IPFS[index].API_PATH,
        headers: {
            authorization: 'Basic ' + Buffer.from(GlobalConfig.IPFS[index].TOKEN).toString('base64')
        }
    })
    // call Core API methods
    // const cid = await client.add(Buffer.from("hello", "utf-8")).then((imgResponse) => {
        const cid = await client.add(data).then((imgResponse) => {
        // return imgResponse;
        return {err: null, data: imgResponse};
    }).catch((err) => {

            console.trace(error)
        return {err: err, data: null};
    });
    console.log(cid)
    // 获取上传文件hash值
    let hashCode = cid.data.cid.toString();
    console.log(hashCode)
    console.timeEnd('main')
}

main()
