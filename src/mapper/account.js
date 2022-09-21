const { exec, escape } = require("../db/mysqlPool");
const xss = require("xss");
const mybatisMapper = require("mybatis-mapper");
const responseFun = (code, err, result) => {
  if (code == 500) {
    console.error(err);
  }
  if (err == null || err == "") {
    err = {
      message: "null",
    };
  }
  return {
    code: code,
    message: err.message,
    result: result,
  };
};

const responseFunStr = (code, err, result) => {
  if (err == null || err == "") {
    err = {
      message: "null",
    };
  }
  return JSON.stringify({
    code: code,
    message: err.message,
    result: result,
  });
};

const login = (username, password) => {
  username = escape(username);
  password = escape(password);
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `select username, realName from users where username='${xss(
    username
  )}' and password=${password}`;
  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};

const accountInsertSelective = (account) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `insert into account (keystore,address,psd,status) values (${xss(
    account.keystore
  )},
'${xss(account.address)}',
'${xss(account.psd)}',
'${xss(account.status)}' )`;
  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};
const nftInsertSelective = (nft) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `insert into nft (
    address,
    collectAddress,
    isFinish,
    title,
    status,
    description,
    imgPath,
    metaData,
    metaDataSource,
    author,
    authorDesc,
    owner,
    hash,
    tokenId,
    nonce,
    creator) values ('${xss(nft.address)}',
 '${xss(nft.collectAddress)}',
 ${nft.isFinish},
 '${xss(nft.title)}',
 ${nft.status} ,
 '${xss(nft.description)}',
 '${xss(nft.imgPath)}',
 '${xss(nft.metaData)}',
 '${xss(nft.metaDataSource)}',
 '${xss(nft.author)}',
 '${xss(nft.authorDesc)}',
 '${xss(nft.owner)}',
 '${xss(nft.hash)}',
 '${xss(nft.tokenId)}',
 '${xss(nft.nonce)}',
 '${xss(nft.creator)}'  )`;

  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};
const nftUpdateSelective = (nft) => {
  if (nft.status != undefined && nft.status != "") {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = `update nft set 
status = ${nft.status} ,
imgPath =  '${xss(nft.imgPath)}', metaData =   '${xss(nft.metaData)}',
    metaDataSource = '${xss(nft.metaDataSource)}',  
    hash =  '${xss(nft.hash)}' where 
    tokenId =  '${xss(nft.tokenId)}' and  status != ${nft.status} `;

    return exec(sql).then((rows) => {
      return rows[0] || null;
    });
  } else {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = `update nft set isFinish = ${nft.isFinish} ,imgPath =  '${xss(
      nft.imgPath
    )}', metaData =   '${xss(nft.metaData)}',
    metaDataSource = '${xss(nft.metaDataSource)}',  hash =  '${xss(
      nft.hash
    )}' where tokenId =  '${xss(nft.tokenId)}' `;

    return exec(sql).then((rows) => {
      return rows[0] || null;
    });
  }
};
const nftUpdateSelectiveStatus = (status, tokenId) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `update nft set status =  ${status} where tokenId =  '${xss(
    tokenId
  )}' `;

  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};
const nftUpdateSelectiveIsFinish = (isFinish, tokenId) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `update nft set isFinish =  ${isFinish} where tokenId =  '${xss(
    tokenId
  )}' `;

  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};
const nftPreInsertSelective = (nft) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = `insert into nft (
    address,
    collectAddress,
    isFinish,
    premetadata,
    status,
    imgPath,
    metaData,
    metaDataSource,
    owner,
    hash,
    tokenId,
    tokenIdDecmial,
    nonce,
    serverPath,
    fileName,
    tempPath,
    creator) values ('${xss(nft.address)}',
 '${xss(nft.collectAddress)}',
 ${nft.isFinish},
 '${xss(nft.premetadata)}',
 ${nft.status} ,
 '${xss(nft.imgPath)}',
 '${xss(nft.metaData)}',
 '${xss(nft.metaDataSource)}',
 '${xss(nft.owner)}',
 '${xss(nft.hash)}',
 '${xss(nft.tokenId)}',
 '${xss(nft.tokenIdDecmial)}',
 ${nft.nonce},
${xss(JSON.stringify(nft.serverPath))},
 '${xss(nft.fileName)}',
 ${xss(JSON.stringify(nft.tempPath))},
 '${xss(nft.creator)}'  )`;

  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};

const accountSelectSelective = (address) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = ` select * from account where address = '${xss(address)}'`;
  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};

const nftSelectSelective = (tokenIds) => {
  let tokenIdsStr = JSON.stringify(tokenIds);
  tokenIdsStr = tokenIdsStr.replace("[", "");
  tokenIdsStr = tokenIdsStr.replace("]", "");
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = ` select * from nft where tokenId in( ${xss(tokenIdsStr)})`;
  // console.log(sql)
  return exec(sql).then((rows) => {
    return rows || [];
  });
};

const nftSelectSelectiveStatus = (status) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = ` select * from nft where status = ${status}`;

  return exec(sql).then((rows) => {
    return rows || [];
  });
};

const nftSelectSelectiveCreator = (creator) => {
  // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
  const sql = ` select * from nft where creator = '${xss(
    creator
  )}'  order by id desc`;
  // console.log(sql)
  return exec(sql).then((rows) => {
    return rows[0] || null;
  });
};

module.exports = {
  login,
  responseFun,
  accountSelectSelective,
  accountInsertSelective,
  nftSelectSelective,
  nftSelectSelectiveStatus,
  nftInsertSelective,
  nftPreInsertSelective,
  nftUpdateSelectiveStatus,
  nftUpdateSelective,
  nftUpdateSelectiveIsFinish,
  nftSelectSelectiveCreator,
  responseFunStr,
};
