const { mintFileUploadIpfs } = require('./mintTask')
async function main() {
    return await mintFileUploadIpfs()
}

main().then(r => console.log(r))
