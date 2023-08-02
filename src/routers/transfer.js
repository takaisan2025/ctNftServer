function transferRouters(app) {
  app.get("/v1/test", async (req, res, next) => {
    let { max } = req.query;
    return res.status(200).json({ max });
  });

  // 积分相关接口
  app.post("/api/account/rcti", async (req, res, next) => {
    const { address, password, type, amount } = req.body;
    // 2 注册积分    1  消费积分
    try {
      try {
        //  判断参数是否满足规范
        let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
          address: address,
        });
        let ret = await exec_sql(sqlResult.result);

        if (ret == null) {
          return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
        }

        let decWalletResult = await getPriKey(ret, password);
        if (decWalletResult.err != null) {
          throw "invalid password";
        } else {
          wallet = decWalletResult.result;
        }
      } catch (err) {
        throw "invalid password";
      }

      var params = { type: 11 }; // 草田积分合约
      var sql = get_mysql("collect", "selectByType", params).result;
      let collectRet = await exec_sql(sql)
        .then((ret) => {
          return ret;
        })
        .catch((err) => {
          console.log("ERR:", err);
          return err;
        });
      if (collectRet == null) {
        throw "collectAddress is error";
      }
      let contractAddress = collectRet.address;
      let tamount;
      if (amount == undefined) {
        tamount = 1;
      } else {
        tamount = amount;
      }
      let { err, hash } = await sendCTI(
        contractAddress,
        address,
        type,
        tamount
      );
      if (err != null) {
        throw err;
      }
      return responseFun(RESPONSE_STATUS.SUCCESS, null, {
        hash: hash,
        type: type,
      });
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, null);
    }
  });

  // 通过个人身份转账接口
  app.post("/api/account/transfer_f", async (req, res, next) => {
    logger.debug("In :%s", new Date().getTime());
    const { address, password, amount, to, tokenId, rebackUrl, orderId } =
      req.body;
    if (isEmpty(password).flag) {
      return PasswordEmpty;
    }
    let collectAddress;
    try {
      let wallet;
      //  判断参数是否满足规范
      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = validateAddress(to);
      if (!ret02.flag) {
        throw ret02.err;
      }
      // if (address.toLowerCase() == to.toLowerCase()) {
      //     throw  "transfer is owner!"
      // }

      let isDump = await getString(orderId);
      if (isDump == "1") {
        return responseFun(RESPONSE_STATUS.ERROR, "ER_DUP_ENTRY", "");
      }

      // 数据库查询订单号状态
      var sqlQueryByOrderId = get_mysql("trans_form_list", "selectByOrderId", {
        orderId: orderId,
      }).result;
      let ex_orderId_ret = await exec_sql(sqlQueryByOrderId);
      console.log("ex_orderId_ret:", ex_orderId_ret);
      if (ex_orderId_ret.result != null) {
        console.log("数据库判断订单号冲突!");
        return responseFun(RESPONSE_STATUS.ERROR, "ER_DUP_ENTRY", "");
      }

      //这里直接查询合约地址
      logger.debug("Start Query NFT:%s", new Date().getTime());
      var params = { tokenId: tokenId };
      var sqlQueryByTokenId = get_mysql(
        "nft",
        "selectByTokenId",
        params
      ).result;
      let nftObj_ret = await exec_sql(sqlQueryByTokenId);

      if (nftObj_ret.err != null) {
        console.log("ERR:", nftObj_ret.err);
      }
      let nftObj = nftObj_ret.result;
      if (nftObj == null) {
        throw "nft is not exist!";
      }
      logger.debug("Over Query NFT:%s", new Date().getTime());
      let supply = nftObj["supply"];
      collectAddress = nftObj["collectAddress"];

      var params = { address: nftObj["collectAddress"] }; // 草田积分合约
      logger.debug("开始Query Contract:%s", new Date().getTime());
      var sql = get_mysql("collect", "selectByAddress", params).result;
      let collectDetail_ret = await exec_sql(sql)
        .then((ret) => {
          return ret;
        })
        .catch((err) => {
          console.log("ERR:", err);
          return err;
        });
      if (collectDetail_ret.err != null) {
        console.log("ERR:", collectDetail_ret.err);
      }
      let collectDetail = collectDetail_ret.result;
      let isBal = await getString("BALANCE_" + collectDetail.owner);
      if (isBal == "1") {
        console.log("redis!" + collectDetail.owner);
        return responseFun(RESPONSE_STATUS.ERROR, "手续费余额不足!", {});
      }
      logger.debug("Over Query Contract:%s", new Date().getTime());

      if (collectDetail == null) {
        throw "collectAddress is error";
      }

      logger.debug("Start Query Account:%s", new Date().getTime());
      let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
        address: address,
      });
      let ret03 = await exec_sql(sqlResult.result);
      logger.debug("Over Query Account:%s", new Date().getTime());
      let ret = ret03.result;
      if (ret == null) {
        return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
      }

      let checkURLRet = checkURL(rebackUrl);
      if (!checkURLRet.flag) {
        throw checkURLRet.err;
      }

      //
      logger.debug("Start dec account:%s", new Date().getTime());
      let decWalletResult = await getPriKey(ret, password);
      logger.debug("Dec Over Query 账户:%s", new Date().getTime());
      if (decWalletResult.err != null) {
        return PasswordError;
      } else {
        wallet = decWalletResult.result;
      }

      // 查询账户实名状况

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

      // 判断合约转账类型
      let contract;
      let transObjFrom;
      let transObjTo;
      let juAmount = 0;
      switch (collectDetail["type"]) {
        case 10:
        case 12:
          contract = new ethers.Contract(
            collectAddress,
            ABI_const["ERC1155Ctnft"].abi, // 10 和 12 是同一个abi
            customHttpProvider
          );
          //    查询协议tokenId的总发行

          //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
          //     链上判断, 这个是一个模糊判断
          // wallet = new ethers.Wallet(
          //     wallet.privateKey,
          //     customHttpProvider
          // );
          // let contractWithSigner = contract.connect(wallet);

          // 链上余额判断
          // let accountBalance = await contractWithSigner.balanceOf(
          //     address,
          //     tokenId
          // );
          // if (accountBalance < amount) {
          //     throw  "chain balance is enough!"
          // }

          // 数据库余额判断
          //    数据库已有数据判断

          // 数据量大的情况下, 这里可能会出现数据库阻塞, 所以发行方不进行这个判断
          // TODO 这里要进行余额判断
          // 这里对藏品余额进行判断
          // 这里对手续费余额进行判断
          logger.debug("Start Query Balance:%s", new Date().getTime());
          var balanceRet = await queryBalanceAndTokenBalance(
            address,
            collectAddress,
            tokenId
          );
          logger.debug("Over Query Balance:%s", new Date().getTime());
          if (balanceRet.err != null) {
            throw err;
          } else {
            let mainBalance = ethers.utils.formatEther(
              Web3.utils.hexToNumberString(balanceRet.data.balance)
            );
            let tokenBalance = Web3.utils.hexToNumberString(
              balanceRet.data.tokenBalance
            );
            // 这里如果是合约发行方的话, 做手续费判断   1155协议
            if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
              if (mainBalance < 50) {
                await setString("BALANCE_" + address, "1", 300);
                throw "手续费余额不足";
              }
            }

            if (tokenBalance < amount) {
              throw "藏品库存不足";
            }

            // if (nftObj["address"].toLowerCase() != address.toLowerCase()) {
            //     transObjFrom = await exec_sql(
            //         get_mysql(
            //             "trans_form_list",
            //             "selectByFormAndTokenId",
            //             {token_id: tokenId, t_from: address}
            //         ).result
            //     )
            //         .then((ret) => {
            //             return ret;
            //         })
            //         .catch((err) => {
            //             console.log("ERR:", err);
            //             return err;
            //         });
            //     transObjTo = await exec_sql(
            //         get_mysql(
            //             "trans_form_list",
            //             "selectByToAndTokenId",
            //             {token_id: tokenId, t_to: address}
            //         ).result
            //     )
            //         .then((ret) => {
            //             return ret;
            //         })
            //         .catch((err) => {
            //             console.log("ERR:", err);
            //             return err;
            //         });
            //
            //     juAmount = 0;
            //     if (transObjFrom && transObjFrom["sumAmount"]) {
            //         juAmount -= Number(transObjFrom["sumAmount"]);
            //     }
            //
            //     if (transObjTo && transObjTo["sumAmount"]) {
            //         juAmount += Number(transObjTo["sumAmount"]);
            //     }
            //     // console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
            //     //     transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
            //     //     nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());
            //
            //     //这里对余额进行判断
            //     //判断是否是发行方,然后根据发行量进行判断
            //     if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
            //         // if (supply > 0) {   // 这里再判断一次, 按理12是都是大于0的
            //         if (Number(supply) - Number(juAmount) <= 0) {
            //             throw "db balance is enough!";
            //         }
            //         // }
            //     } else {
            //         // 根据数据库的转账数量来判断
            //         // 不是发行方,根据数据库转入转出记录判断
            //         if (Number(juAmount) <= 0) {
            //             throw "db balance is enough!";
            //         }
            //     }
            // }

            // save db
            //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
            var sqlQueryByTokenIdAndForm = get_mysql(
              "trans_form_list",
              "insertSelective",
              {
                t_from: address,
                t_to: to,
                collectAddress: collectAddress,
                amount: amount,
                reback_url: rebackUrl,
                token_id: tokenId,
                orderId: orderId,
                type: collectDetail["type"],
                t_status: 1,
              }
            ).result;
            let ex_ret = await exec_sql(sqlQueryByTokenIdAndForm);

            if (ex_ret.err != null) {
              console.log("ERR:", ex_ret.err);
              console.log("ERR_JUDGE:", "ER_DUP_ENTRY" == ex_ret.err);
              if ("ER_DUP_ENTRY" == ex_ret.err) {
                await setString(orderId, "1", 300);
              }
              let isDump = await getString(orderId);
              console.log("isDump:", isDump);
              return responseFun(RESPONSE_STATUS.ERROR, ex_ret.err, "");
            } else {
              logger.debug("Out:%s", new Date().getTime());
              return responseFun(RESPONSE_STATUS.SUCCESS, "", {
                orderId: orderId,
              });
            }

            break;
          }
        case 9:
          contract = new ethers.Contract(
            collectAddress,
            ABI_const["ERC721Ctnft"].abi, // 10 和 12 是同一个abi
            customHttpProvider
          );
          //    Query 协议tokenId的总发行
          supply = 1;

          //    对用户余额做判断, 这里会存在线程安全问题, 所以采用两种方式串行来确保将安全问题降到最小
          //     链上判断, 这个是一个模糊判断
          // wallet = new ethers.Wallet(
          //     wallet.privateKey,
          //     customHttpProvider
          // );
          // contractWithSigner = contract.connect(wallet);
          //
          //
          // // 链上余额判断
          // let accountAddress = await contractWithSigner.ownerOf(
          //     tokenId
          // );
          // if (accountAddress != wallet.address) {
          //     throw  "chain balance is enough!"
          // }

          // 数据库余额判断
          //    数据库已有数据判断
          let transObjFrom_ret01 = await exec_sql(
            get_mysql("trans_form_list", "selectByFormAndTokenId", {
              token_id: tokenId,
              t_from: address,
            }).result
          );
          if (transObjFrom_ret01.err) {
            console.log("ERR:", transObjFrom_ret01.err);
          }
          transObjFrom = transObjFrom_ret01.result;

          let transObjTo_ret02 = await exec_sql(
            getMysqlSqlByTabNameAndSqlNameAndParam(
              "trans_form_list",
              "selectByToAndTokenId",
              { token_id: tokenId, t_to: address }
            ).result
          );

          if (transObjTo_ret02.err != null) {
            console.log("ERR:", transObjTo_ret02.err);
          }
          transObjTo = transObjTo_ret02.result;
          juAmount = 0;
          if (transObjFrom && transObjFrom["sumAmount"]) {
            juAmount -= Number(transObjFrom["sumAmount"]);
          }

          if (transObjTo && transObjTo["sumAmount"]) {
            juAmount += Number(transObjTo["sumAmount"]);
          }

          // console.log(":transObjFrom['sumAmount']", transObjFrom['sumAmount'], "transObjTo['sumAmount']",
          //     transObjTo['sumAmount'], "type", collectDetail['type'], "juAmount", juAmount, "nftObj[\"address\"].toLowerCase()",
          //     nftObj["address"].toLowerCase(), "address.toLowerCase()", address.toLowerCase());
          //这里对余额进行判断
          //判断是否是发行方,然后根据发行量进行判断
          if (nftObj["address"].toLowerCase() == address.toLowerCase()) {
            // if (!supply > 0) {   // 这里再判断一次, 按理9是都是为空的
            if (supply - juAmount <= 0) {
              throw "db balance is enough!";
            }
            // }
          } else {
            // 根据数据库的转账数量来判断
            // 不是发行方,根据数据库转入转出记录判断
            if (Number(juAmount) <= 0) {
              throw "db balance is enough!";
            }
          }

          // save db

          //入库, 等待调度程序上链,这里为了程序安全也会回调,返回成功的交易hash和状态.
          var sqlQueryByTokenIdAndForm1 =
            getMysqlSqlByTabNameAndSqlNameAndParam(
              "trans_form_list",
              "insertSelective",
              {
                t_from: address,
                t_to: to,
                collectAddress: collectAddress,
                amount: amount,
                reback_url: rebackUrl,
                token_id: tokenId,
                orderId: orderId,
                type: collectDetail["type"],
                t_status: 1,
              }
            ).result;
          let ex_ret_01 = await exec_sql(sqlQueryByTokenIdAndForm1);
          if (ex_ret_01.err != null) {
            console.log("ERR:", ex_ret_01.err);
            return responseFun(RESPONSE_STATUS.ERROR, ex_ret_01.err, "");
          } else {
            return responseFun(RESPONSE_STATUS.SUCCESS, "", {
              orderId: orderId,
            });
          }

          break;
        default:
          return responseFun(RESPONSE_STATUS.ERROR, "暂不受支持的合约!", null);
      }
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, null);
    }
  });

  // 转fee
  app.post("/api/account/tfee", async (req, res, next) => {
    const { address, password } = req.body;

    // try {
    //     if (password != "^*(&%^&hkjhhkjhGKJH^&^gjh") {
    //         return responseFun(RESPONSE_STATUS.ERROR, err, null)
    //     } else {
    //         transfer("20000000000000000000", address);
    //     }
    //     return responseFun(RESPONSE_STATUS.SUCCESS, null, {hash: null})
    // } catch (err) {
    //     return responseFun(RESPONSE_STATUS.ERROR, err, null)
    // }
  });
}

module.exports = transferRouters;
