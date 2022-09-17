const {
  login,
  accountSelectSelective,
  accountInsertSelective,
  nftSelectSelective,
  nftSelectSelectiveCreator,
  nftInsertSelective,
  nftPreInsertSelective,
  nftUpdateSelective,
  nftUpdateSelectiveStatus,
  nftUpdateSelectiveIsFinish,
  responseFun,
} = require("../controller/ctnft");
const ethers = require("ethers");
const fetch = require("node-fetch");
const formidable = require("formidable");
const ERC721Ctnft = require("../contract/ERC721Ctnft.json");
const GlobalConfig = require("../config/GlobalConfig.json");
let privateKeyExample =
  ""; // mint pri
let addressExample = ""; // mint pri
const web3 = require("web3");
const ipfsAPI = require("ipfs-api");
const ipfsNode = ipfsAPI({
  host: GlobalConfig.IPFS[0].HOST,
  port: GlobalConfig.IPFS[0].PORT,
  "api-path": GlobalConfig.IPFS[0].API_PATH,
  protocol: GlobalConfig.IPFS[0].PROTOCOL,
});
// 通过定制 URL 连接 :
let url = GlobalConfig.BLOCK_CHAIN.RPC_URL[0];
let customHttpProvider = new ethers.providers.JsonRpcProvider(url, {
  chainId: GlobalConfig.BLOCK_CHAIN.RPC_CHAIN_ID,
});

const fs = require("fs");
const path = require("path");

function Part(account, value) {
  return {
    account,
    value,
  };
}

function Mint721Data(tokenId, tokenURI, creators, royalties, signatures) {
  return {
    tokenId,
    tokenURI,
    creators,
    royalties,
    signatures,
  };
}

const handleUserRouter = async (req, res) => {
  // 单NFT铸造(同步)
  if (req.method === "POST" && req.path === "/api/account/createctNft") {
    return new Promise((resolve, reject) => {
      // 创建表单解析对象
      const form = formidable({});
      form.parse(req, async (err, fields, files) => {
        console.log("fields:", fields);
        if (err) {
          resolve(responseFun(400, "参数解析出错", ""));
          return;
        }

        const file = files.file;

        const { title, collectAddress, desc, author, authorDesc } = fields;

        try {
          //    单个藏品铸造
          const tokenId = addressExample + "c1234567890" + Date.now();
          var tokenURI = ""; //  元数据地址
          // 从私钥获取一个签名器 Signer
          let wallet = new ethers.Wallet(privateKeyExample, customHttpProvider);
          // 这里上传IPFS资源文件
          // 图片资源上传ipfs
          fs.readFile(file.filepath, (err, data) => {
            ipfsNode
              .add(data)
              .then(async (imgResponse) => {
                console.log(imgResponse[0].path);
                //PIN
                ipfsNode.pin.add(imgResponse[0].path);
                let imgIpfsAddress = imgResponse[0].path;
                // 元数据上传ipfs
                const data = new Object();
                data.name = title;
                data.description = desc;
                data.image =
                  "https://dream.chaonft.cn/ipfs/api/v0/cat/" + imgIpfsAddress;
                data.author = author;
                data.authorDesc = authorDesc;
                ipfsNode
                  .add(Buffer.from(JSON.stringify(data), "utf-8"))
                  .then(async (response) => {
                    try {
                      ipfsNode.pin.add(response[0].path);

                      console.log(response[0].path);
                      // 使用Provider 连接合约，将只有对合约的可读权限
                      let contract = new ethers.Contract(
                        collectAddress,
                        ERC721Ctnft.abi,
                        customHttpProvider
                      );
                      // 使用签名器创建一个新的合约实例，它允许使用可更新状态的方法
                      let contractWithSigner = contract.connect(wallet);
                      let transferTo = addressExample;
                      let signatures = [];
                      let minter = addressExample;
                      var creators = Part(minter, 10000);
                      let overrides = {
                        // The maximum units of gas for the transaction to use
                        // gasLimit: 210000,
                        // The price (in wei) per unit of gas
                        // gasPrice: ethers.utils.parseUnits('5000.1', 'gwei'),
                        // The nonce to use in the transaction
                        // nonce: transactionCount1Tx1,
                        // The amount to send with the transaction (i.e. msg.value)
                        // value: utils.parseEther('1.0'),
                        // The chain ID (or network ID) to use
                        // chainId: 27
                      };
                      tokenURI = response[0].path;
                      // 设置一个新值，返回交易
                      let tx = await contractWithSigner.mintAndTransfer(
                        Mint721Data(
                          tokenId,
                          tokenURI,
                          [creators],
                          [],
                          [signatures]
                        ),
                        transferTo,
                        overrides
                      );

                      // 查看: https://ropsten.etherscan.io/tx/0xaf0068dcf728afa5accd02172867627da4e6f946dfb8174a7be31f01b11d5364
                      console.log(tx.hash);

                      // 操作还没完成，需要等待挖矿
                      let ret = await customHttpProvider.waitForTransaction(
                        tx.hash
                      );
                      console.log("inset NFT data:", ret);
                      resolve(responseFun(200, "", { hash: tx.hash }));
                      return;
                    } catch (e) {
                      resolve(responseFun(500, e.message, ""));
                      return;
                    }
                  })
                  .catch((err) => {
                    resolve(responseFun(500, err, {}));
                    return;
                  });
              })
              .catch((err) => {
                resolve(responseFun(500, err, {}));
                return;
              });
          });
        } catch (err) {
          resolve(responseFun(500, err, {}));
          return;
        }
      });
    });
  }
};

module.exports = handleUserRouter;
