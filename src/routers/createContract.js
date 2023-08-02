function createContractRouters(app) {
  app.get("/v1/test", async (req, res, next) => {
    let { max } = req.query;
    return res.status(200).json({ max });
  });

  //创建收藏夹
  app.post("/api/account/createctCollect", async (req, res, next) => {
    // 创建表单解析对象
    try {
      const { address, password, cMetadata, type } = req.body;
      //  判断参数是否满足规范
      if (isEmpty(password).flag) {
        return PasswordEmpty;
      }

      let ret01 = validateAddress(address);
      if (!ret01.flag) {
        throw ret01.err;
      }

      let ret02 = isJson(cMetadata);
      if (!ret02.flag) {
        throw ret02.err;
      }

      if (JSON.stringify(cMetadata).indexOf("{") == -1) {
        return responseFun(RESPONSE_STATUS.ERROR, "invalid paramter data", {});
      }

      // 判断实名
      // 这里好像不需要判断实名, 因为这里一般都是项目方调用, 不会有手续费垫付的情况发生

      let sqlResult = get_mysql("AccountMapper", "selectByAddress", {
        address: address,
      });
      let ret03 = await exec_sql(sqlResult.result);

      let ret = ret03.result;
      if (ret == null) {
        return responseFun(RESPONSE_STATUS.ERROR, "账户不存在!", {});
      }

      if (ret.psd != password) {
        throw "invalid password";
      }
      if (!cMetadata.tokenUrlPrefix) {
        throw "invalid tokenUrlPrefix";
      }
      if (!cMetadata.tokenUrlPrefix.endsWith("/")) {
        throw "invalid tokenUrlPrefix endsWith /";
      }

      let wallet;

      let decWalletResult = await getPriKey(ret, password);
      if (decWalletResult.err != null) {
        return PasswordError;
      } else {
        wallet = decWalletResult.result;
      }
      wallet = new ethers.Wallet(wallet.privateKey, customHttpProvider);

      // 创建收藏夹
      //    查询创建合约的手续费
      let { err, gaslimit } = await createCollectV2Call(type, wallet);

      let initResult = await collectInitCall(
        cMetadata.name,
        cMetadata.symbol,
        cMetadata.tokenUrlPrefix,
        cMetadata.contractUrl,
        type,
        collectAddressExample,
        wallet
      );
      let errInit, gaslimitInit;
      errInit = initResult.err;
      gaslimitInit = initResult.gaslimit;
      if (err != null) {
        console.log("createCollectV2Call faild");
        return responseFun(RESPONSE_STATUS.ERROR, err, {});
      }
      if (errInit != null) {
        console.log("createCollectV2Call faild");
        return responseFun(RESPONSE_STATUS.ERROR, errInit, {});
      }
      //    赠送合约手续费
      let neceliby = ethers.utils.formatEther((gasPrice * gaslimit).toString());
      let necelibyInit = ethers.utils.formatEther(
        (gasPrice * gaslimitInit).toString()
      );
      console.log("neceliby*:", neceliby);
      console.log("necelibyInit*:", necelibyInit);
      console.log("gaslimitInit:", gaslimitInit);
      let necelibyTotal = Number(neceliby) + Number(necelibyInit);
      let balance = await wallet.provider.getBalance(address);
      // 余额是 BigNumber (in wei); 格式化为 ether 字符串
      let etherString = ethers.utils.formatEther(balance);
      console.log("Balance: ", etherString);
      // 计算初始化合约费用
      console.log("余额是否充足:", Number(balance) > Number(necelibyTotal));
      if (Number(etherString) < Number(necelibyTotal)) {
        // if (true) {
        //     let {err, hash} = await transfer(neceliby.toString(), address);
        //     if (err != null) {
        //         console.log("txTransfer faild");
        //         return responseFun(RESPONSE_STATUS.ERROR,  err}, {});
        //     }
        //     console.log("tx Hash:", hash);
        return responseFun(RESPONSE_STATUS.ERROR, "账户余额不足!", {});
      }
      let nonce = await customHttpProvider.getTransactionCount(
        address,
        "latest"
      );
      //    创建合约
      let collectAddress = await createCollectV2(
        wallet,
        gasPrice,
        // gasConfig.create_contract1155.gasPrice,
        gaslimit,
        // gasConfig.create_contract1155.gasLimit,
        type,
        false
      );
      // if (collectAddress == null) {
      //     return responseFun(RESPONSE_STATUS.ERROR,  "创建合约失败", {});
      // }
      // 这里前面已经可以算出合约地址, 这里为了方便,直接计算得出, 不使用返回值.
      // collectAddress = "0x" + util.generateAddress(Buffer.from(stripHexPrefix(wallet.address), "hex"), nonce).toString("hex");
      //    初始化{err, hash}
      let result1 = await collectInit(
        cMetadata.name,
        cMetadata.symbol,
        cMetadata.tokenUrlPrefix,
        cMetadata.contractUrl,
        type,
        collectAddress,
        wallet,
        gaslimitInit
      );
      if (result1.err != null) {
        console.log("txTransfer faild");
        return responseFun(RESPONSE_STATUS.ERROR, result1.err, {});
      }
      let contractName;
      if (type == 10) {
        contractName = ABI_const["ERC721Ctnft"].contractName;
      } else if (type == 12) {
        contractName = ABI_const["ERC1155CtnftOwner"].contractName;
      } else if (type == 9) {
        contractName = ABI_const["ERC1155Ctnft"].contractName;
      } else if (type == 1) {
        contractName = ABI_const["CtnftMToken"].contractName;
      } else {
        contractName = "";
      }
      //  插入收藏夹到数据库
      let collect = {
        address: collectAddress,
        name: cMetadata.name,
        symbol: cMetadata.symbol,
        owner: wallet.address,
        contract_url: cMetadata.contractUrl,
        token_url_prefix: cMetadata.tokenUrlPrefix,
        contract_name: contractName,
        create_address: wallet.address,
        type: type, // v1 1155
      };

      var sql = get_mysql("collect", "insertSelective", collect).result;

      let ret04 = await exec_sql(sql);
      if (ret04.err == null) {
        return responseFun(RESPONSE_STATUS.SUCCESS, "", {
          collectAddress,
          type,
          hash: result1.hash,
        });
      } else {
        return responseFun(RESPONSE_STATUS.ERROR, ret04.err, {});
      }
    } catch (err) {
      return responseFun(RESPONSE_STATUS.ERROR, err, {});
    }
  });
}

module.exports = createContractRouters;
