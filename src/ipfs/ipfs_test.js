const GlobalConfig = require("../config/GlobalConfig.json");
const fs = require("fs");

async function main() {

    console.time('main')
    let fileName = "C:\\Users\\Zq\\Pictures\\2014-2-9\\IMG_20140209_181339.jpg"
    var data = fs.readFileSync(fileName);
    const {create} = await import('ipfs-http-client')
    const client = create({
        timeout: 10000,
        protocol: GlobalConfig.IPFS[0].PROTOCOL,
        host: GlobalConfig.IPFS[0].HOST,
        port: GlobalConfig.IPFS[0].PORT,
        apiPath: GlobalConfig.IPFS[0].API_PATH,
        headers: {
            authorization: 'Basic ' + Buffer.from(GlobalConfig.IPFS[0].TOKEN).toString('base64')
        }
    })
    console.log(data)
    // call Core API methods
    const cid = await client.add(Buffer.from("hello", "utf-8")).then((imgResponse) => {
        // const cid = await client.add(data).then((imgResponse) => {
        // return imgResponse;
        return {err: null, data: imgResponse};
    }).catch((err) => {
        console.log(err)
        return {err: err, data: null};
    });
    console.log(cid)
    // 获取上传文件hash值
    let hashCode = cid.data.cid.toString();
    console.log(hashCode)
    console.timeEnd('main')
}

main()
