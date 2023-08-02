function mintRouters(app) {
  app.get("/v1/test", async (req, res, next) => {
    let { max } = req.query;
    return res.status(200).json({ max });
  });
  // 单NFT铸造(异步)
  app.post(
    "/api/account/createctNftAsyncIncludeFile",
    async (req, res, next) => {
      return new Promise((resolve, reject) => {
        // 创建表单解析对象
        const formsy = formidable({});
        formsy.parse(req, async (err, fields, files) => {
          console.log("fields:", fields);
          if (err) {
            resolve(responseFun(400, "参数解析出错", ""));
            return;
          }

          const file = files.file;

          const {
            address,
            password,
            title,
            collectAddress,
            desc,
            author,
            authorDesc,
          } = fields;
          let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
            address: address,
          });
          let result = await exec_sql(sqlResult.result);
          // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
          return result
            .then(async (ret) => {
              if (ret == null) {
                return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
                return;
              }

              let decWalletResult = await getPriKey(ret, password);
              let wallet;
              if (decWalletResult.err != null) {
                return PasswordError;
              } else {
                wallet = decWalletResult.result;
                return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                  address: wallet.address,
                  privateKey: wallet.privateKey,
                });
              }

              try {
                // address: wallet.address,
                // privateKey: wallet.privateKey,
                //    单个藏品铸造

                const tokenId = address + "c1234567890" + Date.now();
                // 读文件
                fs.readFile(file.filepath, (err, data) => {
                  if (err) {
                    return responseFun(RESPONSE_STATUS.ERROR, err, "");
                  }
                  const basePath = "./public/files";
                  // 创建目录
                  createDir(basePath);
                  // 写入文件
                  fs.writeFile(
                    path.join(basePath, file.originalFilename),
                    data,
                    async (err) => {
                      if (err) {
                        return responseFun(RESPONSE_STATUS.ERROR, err, "");
                      }

                      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                      const resultNft = nftSelectSelectiveCreator(address);

                      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                      resultNft
                        .then(async (retNft) => {
                          let transCount;

                          let obj = {};
                          if (retNft == null) {
                            transCount =
                              await customHttpProvider.getTransactionCount(
                                address
                              );
                          } else {
                            transCount = retNft.nonce + 1;
                          }

                          //    暂时插入数据库
                          console.log("insert...", transCount);
                          let nft = {
                            address,
                            collectAddress,
                            isFinish: 0,
                            title,
                            status: 0, // 未上架
                            description: desc,
                            tokenId: tokenId,
                            author,
                            authorDesc,
                            owner: address,
                            creator: address,
                            serverPath: path.join(
                              basePath,
                              file.originalFilename
                            ),
                            fileName: file.originalFilename,
                            tempPath: file.filepath,
                            tokenIdDecmial:
                              Web3.utils.hexToNumberString(tokenId),
                            nonce: transCount,
                          };

                          let result = nftPreInsertSelective(nft);
                          return result
                            .then(async (ret) => {
                              //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                              // threadProcess(wallet, tokenId);
                              // }, 100)
                              resolve(
                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                  tokenId,
                                })
                              );
                              return;
                            })
                            .catch((err) => {
                              resolve(
                                responseFun(RESPONSE_STATUS.ERROR, err, {})
                              );
                              return;
                            });
                        })
                        .catch((err) => {
                          resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                          return;
                        });
                    }
                  );
                });
              } catch (err) {
                resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                return;
              }
            })
            .catch((err) => {
              resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
              return;
            });
        });
      });
    }
  );

  app.post(
    "/api/account/createctNftAsyncSplitParam",
    async (req, res, next) => {
      return new Promise((resolve, reject) => {
        // 创建表单解析对象
        const {
          address,
          password,
          title,
          collectAddress,
          desc,
          author,
          authorDesc,
          file,
        } = req.body;
        let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
          address: address,
        });
        let result = exec_sql(sqlResult.result);
        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
        return result
          .then(async (ret) => {
            if (ret == null) {
              resolve(responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {}));
              return;
            }
            let wallet;
            let decWalletResult = await getPriKey(ret, password);
            if (decWalletResult.err != null) {
              resolve(PasswordError);
            } else {
              wallet = decWalletResult.result;
            }

            try {
              // address: wallet.address,
              // privateKey: wallet.privateKey,
              //    单个藏品铸造
              const tokenId = address + "c1234567890" + Date.now();
              // 读文件
              fetch(file)
                .then((res) => res.arrayBuffer())
                .then((data) => {
                  // console.log(data);
                  const basePath = "/public/files/" + Date.now();
                  // 创建目录
                  createDir(basePath);
                  // 写入文件
                  var originalFilename = file.substring(
                    file.lastIndexOf("/") + 1
                  );
                  console.log(originalFilename);
                  fs.writeFile(
                    path.join(basePath, originalFilename),
                    Buffer.from(data),
                    async (err) => {
                      if (err) {
                        return responseFun(RESPONSE_STATUS.ERROR, err, "");
                      }

                      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
                      const resultNft = nftSelectSelectiveCreator(address);

                      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
                      resultNft
                        .then(async (retNft) => {
                          let transCount;
                          if (retNft == null) {
                            transCount =
                              await customHttpProvider.getTransactionCount(
                                address
                              );
                          } else {
                            transCount = retNft.nonce + 1;
                          }

                          //    暂时插入数据库
                          console.log("insert...", transCount);
                          let nft = {
                            address,
                            collectAddress,
                            isFinish: 0,
                            title,
                            status: 0, // 未上架
                            description: desc,
                            tokenId: tokenId,
                            author,
                            authorDesc,
                            owner: address,
                            creator: address,
                            serverPath: path.join(basePath, originalFilename),
                            fileName: originalFilename,
                            tempPath: file,
                            tokenIdDecmial:
                              Web3.utils.hexToNumberString(tokenId),
                            nonce: transCount,
                          };

                          let result = nftPreInsertSelective(nft);
                          return result
                            .then(async (ret) => {
                              //起异步线程处理问题. 这里因为js的单线程和并发弱的问题, 所以这里使用单独的函数来处理  nft.js
                              // threadProcess(wallet, tokenId);
                              // }, 100)
                              resolve(
                                responseFun(RESPONSE_STATUS.SUCCESS, "", {
                                  tokenId,
                                })
                              );
                              return;
                            })
                            .catch((err) => {
                              resolve(
                                responseFun(RESPONSE_STATUS.ERROR, err, {})
                              );
                              return;
                            });
                        })
                        .catch((err) => {
                          resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
                          return;
                        });
                    }
                  );
                });
            } catch (err) {
              resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
              return;
            }
          })
          .catch((err) => {
            resolve(responseFun(RESPONSE_STATUS.ERROR, err, {}));
            return;
          });
      });
    }
  );

  app.post(
    "/api/account/createctNftAsyncDivTokenId",
    async (req, res, next) => {
      // 创建表单解析对象
      const {
        address,
        password,
        collectAddress,
        file,
        data,
        tokenId,
        rebackUrl,
      } = req.body;
      if (isEmpty(password).flag) {
        return PasswordEmpty;
      }
      try {
        //  判断参数是否满足规范
        let { err, flag } = validateAddress(address);
        if (!flag) {
          throw err;
        }

        let { err1, flag1 } = (() => {
          let { err, flag } = validateAddress(collectAddress);
          return { err1: err, flag1: flag };
        })();
        if (!flag1) {
          throw err1;
        }

        let { err2, flag2 } = (() => {
          let { err, flag } = isJson(data);
          return { err2: err, flag2: flag };
        })();
        if (!flag2) {
          throw err2;
        }
        let checkURLRet = checkURL(rebackUrl);
        if (!checkURLRet.flag) {
          throw checkURLRet.err;
        }
      } catch (e) {
        return responseFun(RESPONSE_STATUS.ERROR, e, {});
      }
      //  判断参数是否满足规范
      let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
        address: address,
      });
      let ret = await exec_sql(sqlResult.result);

      if (ret == null) {
        return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
      }
      let wallet;
      let decWalletResult = await getPriKey(ret, password);
      if (decWalletResult.err != null) {
        return PasswordError;
      } else {
        wallet = decWalletResult.result;
      }
      wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

      try {
        // 查询合约基本信息  type   == 10
        var sql = get_mysql("collect", "selectByAddress", {
          address: collectAddress,
        }).result;

        let collectRet = await exec_sql(sql)
          .then((ret) => {
            return ret;
          })
          .catch((err) => {
            console.log("ERR:", err);
            return err;
          });
        if (collectRet == null || collectRet.type !== 9) {
          throw "collectAddress is error";
        }
        // address: wallet.address,
        // privateKey: wallet.privateKey,
        //    单个藏品铸造
        // const tokenId = tokenId;

        // 读文件
        let dataBuffer = await fetch(file)
          .then((res) => res.arrayBuffer())
          .then((dataBuffer) => {
            return dataBuffer;
          });
        const basePath = "/public/files/" + Date.now();
        // 创建目录
        createDir(basePath);
        // 写入文件
        var originalFilename = file.substring(file.lastIndexOf("/") + 1);
        console.log(originalFilename);
        let { err } = await new Promise((resolve, reject) => {
          fs.writeFile(
            path.join(basePath, originalFilename),
            Buffer.from(dataBuffer),
            (err) => {
              resolve({ err });
            }
          );
        }).then((ret) => {
          return ret;
        });
        if (err) {
          throw err;
        }

        // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
        // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
        let retNft = await nftSelectSelectiveCreator(address)
          .then((retNft) => {
            return retNft;
          })
          .catch((err) => {
            return responseFun(RESPONSE_STATUS.ERROR, err, {});
          });

        let transCount;
        if (retNft == null) {
          transCount = await customHttpProvider.getTransactionCount(address);
        } else {
          transCount = retNft.nonce + 1;
        }

        //    暂时插入数据库
        console.log("insert...", transCount);
        let nft = {
          address,
          collectAddress,
          isFinish: 0,
          premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
          status: 0, // 未上架
          tokenId: tokenId,
          owner: address,
          creator: address,
          serverPath: path.join(basePath, originalFilename),
          fileName: originalFilename,
          tempPath: file,
          tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
          nonce: transCount,
          rebackUrl: rebackUrl,
        };

        return await nftPreInsertSelective(nft)
          .then((ret) => {
            // return ret;
            return responseFun(RESPONSE_STATUS.SUCCESS, "", {
              tokenId,
            });
          })
          .catch((err) => {
            console.log("ERR:", err);
            return responseFun(RESPONSE_STATUS.ERROR, err, {});
          });
      } catch (err) {
        return responseFun(RESPONSE_STATUS.ERROR, err, {});
      }
    }
  );

  // 异步铸造721接口
  app.post("/api/account/createctNftAsync", async (req, res, next) => {
    // 创建表单解析对象
    const { address, password, collectAddress, file, data, rebackUrl } =
      req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    try {
      //  判断参数是否满足规范
      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = validateAddress(collectAddress);

      if (!ret02.flag) {
        throw ret02.err;
      }

      let ret03 = isJson(data);
      if (!ret03.flag) {
        throw ret03.err;
      }

      let checkURLRet = checkURL(rebackUrl);
      if (!checkURLRet.flag) {
        throw checkURLRet.err;
      }

      let checkURLRet1 = checkURL(file);
      if (!checkURLRet1.flag) {
        throw checkURLRet1.err;
      }
    } catch (e) {
      return responseFun(RESPONSE_STATUS.ERROR, e, {});
    }

    //  判断参数是否满足规范
    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
      address: address,
    });
    let ret04 = await exec_sql(sqlResult.result);

    let ret = ret04.result;
    if (ret == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
    }

    // 判断账户余额
    var params1 = { address: collectAddress };
    var sql1 = get_mysql("collect", "selectByAddress", params1).result;
    let collectDetail01 = await exec_sql(sql1);

    if (collectDetail01.err != null) {
      console.trace("ERR:", err);
    }
    if (collectDetail01.result == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "没有找到匹配的合约信息!", {});
    }

    let collectDetail = collectDetail01.result;

    // 查询账户实名状况

    let isBal = await getString("BALANCE_" + collectDetail.owner);
    if (isBal == "1") {
      return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
    }

    // 判断商家身份
    if (GlobalConfig.CAN_AUTH) {
      if (address != collectDetail.owner) {
        let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
        let isAuth = await contract_static_call(
          ethers,
          authContractAddress,
          ABI_const["AuthController"].abi,
          "authsSingle",
          customHttpProvider,
          [address]
        );
        if (isAuth.data != true) {
          return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
        }
      }
    }

    let wallet;
    // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
    let decWalletResult = await getPriKey(ret, password);
    if (decWalletResult.err != null) {
      throw PasswordError;
    } else {
      wallet = decWalletResult.result;
    }
    wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
    let balance = await wallet.provider.getBalance(collectDetail.owner);
    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
    let etherString = ethers.utils.formatEther(balance);
    console.log("Balance: ", etherString);
    // 计算初始化合约费用
    if (Number(etherString) < Number(10)) {
      // if (true) {
      //     let {err, hash} = await transfer(neceliby.toString(), address);
      //     if (err != null) {
      //         console.log("txTransfer faild");
      //         return responseFun(RESPONSE_STATUS.ERROR,  err}, {});
      //     }
      //     console.log("tx Hash:", hash);
      return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
    }

    try {
      // 查询合约基本信息  type   == 10
      var params = { address: collectAddress };
      var sql = get_mysql("collect", "selectByAddress", params).result;

      let collectRet02 = await exec_sql(sql)
        .then((ret) => {
          return ret;
        })
        .catch((err) => {
          console.log("ERR:", err);
          return err;
        });
      collectRet02.err;
      let collectRet = collectRet02.result;
      if (collectRet == null || collectRet.type !== 9) {
        throw "collectAddress is error";
      }
      // address: wallet.address,
      // privateKey: wallet.privateKey,
      //    单个藏品铸造
      const tokenId = address + "c1234567890" + Date.now();
      // 读文件
      let dataBuffer = await fetch(file)
        .then((res) => res.arrayBuffer())
        .then((dataBuffer) => {
          return dataBuffer;
        });
      const basePath = "/public/files/" + Date.now();
      // 创建目录
      createDir(basePath);
      // 写入文件
      var originalFilename = file.substring(file.lastIndexOf("/") + 1);
      console.log(originalFilename);
      let { err } = await new Promise((resolve, reject) => {
        fs.writeFile(
          path.join(basePath, originalFilename),
          Buffer.from(dataBuffer),
          (err) => {
            resolve({ err });
          }
        );
      }).then((ret) => {
        return ret;
      });
      if (err) {
        throw err;
      }

      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"

      //    暂时插入数据库
      let nft = {
        address,
        collectAddress,
        isFinish: 0,
        premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
        status: 0, // 未上架
        tokenId: tokenId,
        owner: address,
        creator: address,
        serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
        fileName: originalFilename,
        tempPath: file,
        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
        nonce: "0",
        rebackUrl: rebackUrl,
      };

      // 插入数据库
      // Get SQL Statement
      var sql = get_mysql("nft", "insertSelective", nft).result;
      return await exec_sql(sql)
        .then((ret) => {
          // return ret;
          // fileUploadIpfs();
          return responseFun(RESPONSE_STATUS.SUCCESS, "", {
            tokenId,
          });
        })
        .catch((err) => {
          console.log("ERR:", err);
          return responseFun(RESPONSE_STATUS.ERROR, err, {});
        });
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });

  app.post("/api/account/createNftAsync", async (req, res, next) => {
    // 创建表单解析对象
    const { address, password, collectAddress, file, data, rebackUrl } =
      req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    try {
      //  判断参数是否满足规范
      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = validateAddress(collectAddress);

      if (!ret02.flag) {
        throw ret02.err;
      }

      let ret03 = isJson(data);
      if (!ret03.flag) {
        throw ret03.err;
      }

      let checkURLRet = checkURL(rebackUrl);
      if (!checkURLRet.flag) {
        throw checkURLRet.err;
      }

      let checkURLRet1 = checkURL(file);
      if (!checkURLRet1.flag) {
        throw checkURLRet1.err;
      }
    } catch (e) {
      return responseFun(RESPONSE_STATUS.ERROR, e, {});
    }

    //  判断参数是否满足规范
    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
      address: address,
    });
    let ret04 = await exec_sql(sqlResult.result);

    let ret = ret04.result;
    if (ret == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
    }

    // 判断账户余额
    var params1 = { address: collectAddress };
    var sql1 = get_mysql("collect", "selectByAddress", params1).result;
    let collectDetail01 = await exec_sql(sql1);

    if (collectDetail01.err != null) {
      console.trace("ERR:", err);
    }
    if (collectDetail01.result == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "没有找到匹配的合约信息!", {});
    }

    let collectDetail = collectDetail01.result;

    // 查询账户实名状况

    let isBal = await getString("BALANCE_" + collectDetail.owner);
    if (isBal == "1") {
      return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
    }

    // 判断商家身份
    if (GlobalConfig.CAN_AUTH) {
      if (address != collectDetail.owner) {
        let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
        let isAuth = await contract_static_call(
          ethers,
          authContractAddress,
          ABI_const["AuthController"].abi,
          "authsSingle",
          customHttpProvider,
          [address]
        );
        if (isAuth.data != true) {
          return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
        }
      }
    }

    let wallet;
    // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
    let decWalletResult = await getPriKey(ret, password);
    if (decWalletResult.err != null) {
      throw PasswordError;
    } else {
      wallet = decWalletResult.result;
    }
    wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);
    let balance = await wallet.provider.getBalance(collectDetail.owner);
    // 余额是 BigNumber (in wei); 格式化为 ether 字符串
    let etherString = ethers.utils.formatEther(balance);
    console.log("Balance: ", etherString);
    // 计算初始化合约费用
    if (Number(etherString) < Number(10)) {
      // if (true) {
      //     let {err, hash} = await transfer(neceliby.toString(), address);
      //     if (err != null) {
      //         console.log("txTransfer faild");
      //         return responseFun(RESPONSE_STATUS.ERROR,  err}, {});
      //     }
      //     console.log("tx Hash:", hash);
      return responseFun(RESPONSE_STATUS.ERROR, "合约账户余额不足!", {});
    }

    try {
      // 查询合约基本信息  type   == 10
      var params = { address: collectAddress };
      var sql = get_mysql("collect", "selectByAddress", params).result;

      let collectRet02 = await exec_sql(sql)
        .then((ret) => {
          return ret;
        })
        .catch((err) => {
          console.log("ERR:", err);
          return err;
        });
      collectRet02.err;
      let collectRet = collectRet02.result;
      if (collectRet == null || collectRet.type !== 9) {
        throw "collectAddress is error";
      }
      // address: wallet.address,
      // privateKey: wallet.privateKey,
      //    单个藏品铸造
      const tokenId = address + "c1234567890" + Date.now();
      // 读文件
      let dataBuffer = await fetch(file)
        .then((res) => res.arrayBuffer())
        .then((dataBuffer) => {
          return dataBuffer;
        });
      const basePath = "/public/files/" + Date.now();
      // 创建目录
      createDir(basePath);
      // 写入文件
      var originalFilename = file.substring(file.lastIndexOf("/") + 1);
      console.log(originalFilename);
      let { err } = await new Promise((resolve, reject) => {
        fs.writeFile(
          path.join(basePath, originalFilename),
          Buffer.from(dataBuffer),
          (err) => {
            resolve({ err });
          }
        );
      }).then((ret) => {
        return ret;
      });
      if (err) {
        throw err;
      }

      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"

      //    暂时插入数据库
      let nft = {
        address,
        collectAddress,
        isFinish: 0,
        premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
        status: 0, // 未上架
        tokenId: tokenId,
        owner: address,
        creator: address,
        serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
        fileName: originalFilename,
        tempPath: file,
        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
        nonce: "0",
        rebackUrl: rebackUrl,
      };

      // 插入数据库
      // Get SQL Statement
      var sql = get_mysql("nft", "insertSelective", nft).result;
      return await exec_sql(sql)
        .then((ret) => {
          // return ret;
          // fileUploadIpfs();
          return responseFun(RESPONSE_STATUS.SUCCESS, "", {
            tokenId,
          });
        })
        .catch((err) => {
          console.log("ERR:", err);
          return responseFun(RESPONSE_STATUS.ERROR, err, {});
        });
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });

  // 批量铸造
  app.post("/api/account/createctNft1155AsyncV1", async (req, res, next) => {
    // 创建表单解析对象
    const {
      address,
      password,
      collectAddress,
      file,
      supply,
      judge,
      data,
      cMetadata,
    } = req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    try {
      let { err2, flag2 } = (() => {
        let { err, flag } = isJson(data);
        return { err2: err, flag2: flag };
      })();
      let { err1, flag1 } = (() => {
        let { err, flag } = isJson(cMetadata);
        return { err1: err, flag1: flag };
      })();
      if (!flag1 || !flag2) {
        throw err2;
      }
    } catch (e) {
      return responseFun(RESPONSE_STATUS.ERROR, e, {});
    }
    //  判断参数是否满足规范
    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
      address: address,
    });
    let ret = await exec_sql(sqlResult.result);

    //
    if (ret == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
    }
    let decWalletResult = await getPriKey(ret, password);
    let wallet;
    if (decWalletResult.err != null) {
      return PasswordError;
    } else {
      wallet = decWalletResult.result;
    }

    try {
      // TODO 这里需要先判断余额是否满足
      //查询需要的gas
      wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

      let name, symbol, tokenUrlPrefix, contractUrl;
      name = cMetadata.name;
      symbol = cMetadata.symbol;
      tokenUrlPrefix = cMetadata.tokenUrlPrefix;
      contractUrl = cMetadata.contractUrl;
      let gasCall = await createCollectV1Erc1155Call(
        name,
        symbol,
        tokenUrlPrefix,
        contractUrl,
        wallet
      );
      if (gasCall.err != null) {
        return responseFun(RESPONSE_STATUS.ERROR, gasCall.err, "");
      } else {
        let neceGas = gasPrice * gasCall.gaslimit;
        // 判断手续费是否足够
        let balance = await wallet.provider.getBalance(address);
        // 余额是 BigNumber (in wei); 格式化为 ether 字符串
        console.log("Balance: ", balance.toString());
        console.log("neceGas: ", neceGas);
        // 这里多赠送手续费
        let neceGas1 = neceGas + supply * 0.2 * 1000000000000000000;
        // 判断是否赠送手续费
        if (neceGas > balance.toString()) {
          if (judge == true) {
            //     赠送手续费
            let walletSys = new ethers.Wallet(
              privateKeySys,
              customHttpProvider
            );
            let tx = {
              to: address,
              // ... or supports ENS names
              // to: "ricmoo.firefly.eth"
              // We must pass in the amount as wei (1 ether = 1e18 wei), so we
              // use this convenience function to convert ether to wei.
              value: Web3.utils.numberToHex(neceGas1),
            };

            let txTransfer = await walletSys.sendTransaction(tx);
            console.log("txTransfer: :", txTransfer.hash);
            try {
              let recept1 = await customHttpProvider.waitForTransaction(
                txTransfer.hash
              );
              if (recept1.status === TRANSACTION_RECEIPT_STATUS.REVERTED) {
                throw "Transaction Reverted";
              }
            } catch (err) {
              console.log("txTransfererr:", err); // 这里会因为系统账户的nonce问题导致失败, 直接忽略
              return responseFun(
                RESPONSE_STATUS.ERROR,
                "Transaction Reverted",
                ""
              );
            }
          } else {
            return responseFun(RESPONSE_STATUS.ERROR, "余额不足", "");
          }
        }
        //    余额足够
        let contractAddress = await createCollectV1Erc1155(
          name,
          symbol,
          tokenUrlPrefix,
          contractUrl,
          wallet,
          gasPrice,
          gasCall.gaslimit,
          false
        );
        //  插入收藏夹到数据库
        let collect = {
          address: contractAddress,
          name: name,
          symbol: symbol,
          owner: wallet.address,
          contract_url: contractUrl,
          token_url_prefix: tokenUrlPrefix,
          contract_name: ABI_const["CtnftMToken"].contractName,
          create_address: wallet.address,
          type: 1, // v1 1155
        };
        var sql = get_mysql("collect", "insertSelective", collect).result;

        let collectRet = await exec_sql(sql)
          .then((ret) => {
            return responseFun(RESPONSE_STATUS.SUCCESS, "", {
              ret,
            });
          })
          .catch((err) => {
            console.log("ERR:", err);
            return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
          });
        if (collectRet.code == RESPONSE_STATUS.SUCCESS) {
          const tokenId = "0x1";
          // 读文件
          let dataBuffer = await fetch(file)
            .then((res) => res.arrayBuffer())
            .then((dataBuffer) => {
              return dataBuffer;
            });
          const basePath = "/public/files/" + Date.now();
          // 创建目录
          createDir(basePath);
          // 写入文件
          var originalFilename = file.substring(file.lastIndexOf("/") + 1);
          console.log(originalFilename);
          let { err } = await new Promise((resolve, reject) => {
            fs.writeFile(
              path.join(basePath, originalFilename),
              Buffer.from(dataBuffer),
              (err) => {
                resolve({ err });
              }
            );
          }).then((ret) => {
            return ret;
          });
          if (err) {
            return responseFun(RESPONSE_STATUS.ERROR, err, "");
          }

          // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
          // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
          let retNft = await nftSelectSelectiveCreator(address)
            .then((retNft) => {
              return retNft;
            })
            .catch((err) => {
              return responseFun(RESPONSE_STATUS.ERROR, err, {});
            });

          let transCount;
          if (retNft == null) {
            transCount = await customHttpProvider.getTransactionCount(address);
          } else {
            transCount = retNft.nonce + 1;
          }

          //    暂时插入数据库
          console.log("insert...", transCount);
          let nft = {
            address,
            isFinish: 0,
            premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
            status: 0, // 未上架
            supply,
            tokenId: tokenId,
            owner: address,
            creator: address,
            serverPath: path.join(basePath, originalFilename),
            fileName: originalFilename,
            tempPath: file,
            tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
            nonce: transCount,
          };

          // 插入数据库
          // Get SQL Statement
          var sql = get_mysql("nft", "insertSelective", nft);
          return await exec_sql(sql)
            .then((ret) => {
              return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                tokenId,
                contractAddress,
              });
            })
            .catch((err) => {
              console.log("ERR:", err);
              return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
            });
        } else {
          return collectRet;
        }
      }
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });

  app.post("/api/account/createctNft1155Async", async (req, res, next) => {
    // 创建表单解析对象
    const { address, password, collectAddress, file, data, supply, rebackUrl } =
      req.body;
    let {} = req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    try {
      //  判断参数是否满足规范
      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = validateAddress(collectAddress);
      if (!ret02.flag) {
        throw ret02.err;
      }

      let ret03 = isJson(data);
      if (!ret03.flag) {
        throw ret03.err;
      }
      let checkURLRet = checkURL(rebackUrl);
      if (!checkURLRet.flag) {
        throw checkURLRet.err;
      }

      let checkURLRet1 = checkURL(file);
      if (!checkURLRet1.flag) {
        throw checkURLRet1.err;
      }
    } catch (e) {
      return responseFun(RESPONSE_STATUS.ERROR, e, {});
    }
    if (supply < 1) {
      return responseFun(RESPONSE_STATUS.ERROR, "supply 必须大于0", {});
    }
    // if (supply >= 100000) {
    //     return responseFun(RESPONSE_STATUS.ERROR,  "supply must less than 100000", {});
    // }

    //  判断参数是否满足规范
    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
      address: address,
    });
    let ret002 = await exec_sql(sqlResult.result);

    //
    if (ret002.result == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
    }
    let wallet;
    // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
    let decWalletResult = await getPriKey(ret002.result, password);
    if (decWalletResult.err != null) {
      return PasswordError;
    } else {
      wallet = decWalletResult.result;
    }

    try {
      // 查询合约基本信息  type   == 10

      var params = { address: collectAddress };
      var sql = get_mysql("collect", "selectByAddress", params).result;

      let collectRet02 = await exec_sql(sql);
      if (collectRet02.err != null) {
        console.log("ERR:", collectRet02.err);
      }
      let collectRet = collectRet02.result;
      if (
        collectRet == null ||
        (collectRet.type !== 10 && collectRet.type !== 12)
      ) {
        throw "collectAddress is error";
      }

      // 查询账户实名状况

      // 判断商家身份
      if (GlobalConfig.CAN_AUTH) {
        if (address != collectRet.owner) {
          let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
          let isAuth = await contract_static_call(
            ethers,
            authContractAddress,
            ABI_const["AuthController"].abi,
            "authsSingle",
            customHttpProvider,
            [address]
          );
          if (isAuth.data != true) {
            return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
          }
        }
      }
      // address: wallet.address,
      // privateKey: wallet.privateKey,
      //    单个藏品铸造
      const tokenId = address + "c1234567890" + Date.now();
      // 读文件
      let dataBuffer = await fetch(file)
        .then((res) => res.arrayBuffer())
        .then((dataBuffer) => {
          return dataBuffer;
        });
      const basePath = "/public/files/" + Date.now();
      // 创建目录
      createDir(basePath);
      // 写入文件
      var originalFilename = file.substring(file.lastIndexOf("/") + 1);
      console.log(originalFilename);
      let { err } = await new Promise((resolve, reject) => {
        fs.writeFile(
          path.join(basePath, originalFilename),
          Buffer.from(dataBuffer),
          (err) => {
            resolve({ err });
          }
        );
      }).then((ret) => {
        return ret;
      });
      if (err) {
        return responseFun(RESPONSE_STATUS.ERROR, err, "");
      }

      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
      let retNft = await nftSelectSelectiveCreator(address)
        .then((retNft) => {
          return retNft;
        })
        .catch((err) => {
          return responseFun(RESPONSE_STATUS.ERROR, err, {});
        });

      // await setString(
      //   "WALLET_ACCOUNT_" + address,
      //   JSON.stringify(decWalletResult.result),
      //   300
      // );

      //    暂时插入数据库
      let nft = {
        address,
        isFinish: 0,
        premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
        status: 0, // 未上架
        supply,
        collectAddress,
        tokenId: tokenId,
        owner: address,
        creator: address,
        serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
        fileName: originalFilename,
        tempPath: file,
        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
        nonce: "0",
        rebackUrl: rebackUrl,
      };

      // 插入数据库
      // Get SQL Statement

      var sql = get_mysql("nft", "insertSelective", nft).result;
      return await exec_sql(sql)
        .then((ret) => {
          // fileUploadIpfs();
          return responseFun(RESPONSE_STATUS.SUCCESS, "", {
            tokenId,
          });
        })
        .catch((err) => {
          console.log("ERR:", err);
          return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
        });
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });

  app.post("/api/account/createNft1155Async", async (req, res, next) => {
    // 创建表单解析对象
    const { address, password, collectAddress, file, data, supply, rebackUrl } =
      req.body;
    let {} = req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    try {
      //  判断参数是否满足规范
      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = validateAddress(collectAddress);
      if (!ret02.flag) {
        throw ret02.err;
      }

      let ret03 = isJson(data);
      if (!ret03.flag) {
        throw ret03.err;
      }
      let checkURLRet = checkURL(rebackUrl);
      if (!checkURLRet.flag) {
        throw checkURLRet.err;
      }

      let checkURLRet1 = checkURL(file);
      if (!checkURLRet1.flag) {
        throw checkURLRet1.err;
      }
    } catch (e) {
      return responseFun(RESPONSE_STATUS.ERROR, e, {});
    }
    if (supply < 1) {
      return responseFun(RESPONSE_STATUS.ERROR, "supply 必须大于0", {});
    }
    // if (supply >= 100000) {
    //     return responseFun(RESPONSE_STATUS.ERROR,  "supply must less than 100000", {});
    // }

    //  判断参数是否满足规范
    let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
      address: address,
    });
    let ret002 = await exec_sql(sqlResult.result);

    //
    if (ret002.result == null) {
      return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
    }
    let wallet;
    // wallet = await ethers.Wallet.fromEncryptedJson(ret.keystore, password);
    let decWalletResult = await getPriKey(ret002.result, password);
    if (decWalletResult.err != null) {
      return PasswordError;
    } else {
      wallet = decWalletResult.result;
    }

    try {
      // 查询合约基本信息  type   == 10

      var params = { address: collectAddress };
      var sql = get_mysql("collect", "selectByAddress", params).result;

      let collectRet02 = await exec_sql(sql);
      if (collectRet02.err != null) {
        console.log("ERR:", collectRet02.err);
      }
      let collectRet = collectRet02.result;
      if (
        collectRet == null ||
        (collectRet.type !== 10 && collectRet.type !== 12)
      ) {
        throw "collectAddress is error";
      }

      // 查询账户实名状况

      // 判断商家身份
      if (GlobalConfig.CAN_AUTH) {
        if (address != collectRet.owner) {
          let authContractAddress = GlobalConfig.AUTH_CONTROLLER_ADDRESS;
          let isAuth = await contract_static_call(
            ethers,
            authContractAddress,
            ABI_const["AuthController"].abi,
            "authsSingle",
            customHttpProvider,
            [address]
          );
          if (isAuth.data != true) {
            return responseFun(500, "用户信息未认证或过期,请稍后重试!", {});
          }
        }
      }
      // address: wallet.address,
      // privateKey: wallet.privateKey,
      //    单个藏品铸造
      const tokenId = address + "c1234567890" + Date.now();
      // 读文件
      let dataBuffer = await fetch(file)
        .then((res) => res.arrayBuffer())
        .then((dataBuffer) => {
          return dataBuffer;
        });
      const basePath = "/public/files/" + Date.now();
      // 创建目录
      createDir(basePath);
      // 写入文件
      var originalFilename = file.substring(file.lastIndexOf("/") + 1);
      console.log(originalFilename);
      let { err } = await new Promise((resolve, reject) => {
        fs.writeFile(
          path.join(basePath, originalFilename),
          Buffer.from(dataBuffer),
          (err) => {
            resolve({ err });
          }
        );
      }).then((ret) => {
        return ret;
      });
      if (err) {
        return responseFun(RESPONSE_STATUS.ERROR, err, "");
      }

      // 这里查询数据库有没有交易记录, 有的话,使用数据库的, 没有就查询链上
      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
      let retNft = await nftSelectSelectiveCreator(address)
        .then((retNft) => {
          return retNft;
        })
        .catch((err) => {
          return responseFun(RESPONSE_STATUS.ERROR, err, {});
        });

      // await setString(
      //   "WALLET_ACCOUNT_" + address,
      //   JSON.stringify(decWalletResult.result),
      //   300
      // );

      //    暂时插入数据库
      let nft = {
        address,
        isFinish: 0,
        premetadata: JSON.stringify(data).replace(/&quot;/g, '\\"'),
        status: 0, // 未上架
        supply,
        collectAddress,
        tokenId: tokenId,
        owner: address,
        creator: address,
        serverPath: xss(JSON.stringify(path.join(basePath, originalFilename))),
        fileName: originalFilename,
        tempPath: file,
        tokenIdDecmial: Web3.utils.hexToNumberString(tokenId),
        nonce: "0",
        rebackUrl: rebackUrl,
      };

      // 插入数据库
      // Get SQL Statement

      var sql = get_mysql("nft", "insertSelective", nft).result;
      return await exec_sql(sql)
        .then((ret) => {
          // fileUploadIpfs();
          return responseFun(RESPONSE_STATUS.SUCCESS, "", {
            tokenId,
          });
        })
        .catch((err) => {
          console.log("ERR:", err);
          return responseFun(RESPONSE_STATUS.ERROR, err.code, {});
        });
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });
}

module.exports = mintRouters;
