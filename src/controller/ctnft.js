const {exec, escape} = require("../db/mysqlPool");
const xss = require("xss");

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

const execSql = (sql) => {
    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};

const execSqlAll = (sql) => {
    return exec(sql).then((rows) => {
        return rows || [];
    });
};

const accountSelectByKeyStore = (key) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = ` select * from account where address = '${xss(address)}'`;
    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};

const accountUpdateSelective = (keystore) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = `update account set
    keystore = ${xss(
    account.keystore
  )}   where
    id =  ${xss(id)} and  keystore = 'none'` ;
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
        const sql = `update nft set isFinish = ${nft.isFinish} ,imgPath =  '${xss(nft.imgPath)}', metaData =   '${xss(nft.metaData)}',
    metaDataSource = '${xss(nft.metaDataSource)}',  hash =  '${xss(nft.hash)}' where tokenId =  '${xss(nft.tokenId)}' `;

        return exec(sql).then((rows) => {
            return rows[0] || null;
        });
    }

};
const nftUpdateSelectiveStatus = (status, tokenId) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = `update nft set status =  ${status} where tokenId =  '${xss(tokenId)}' `;

    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};
const nftUpdateSelectiveIsFinish = (isFinish, tokenId) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = `update nft set isFinish =  ${isFinish} where tokenId =  '${xss(tokenId)}' `;

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
    rebackUrl,
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
 ${xss(nft.rebackUrl)},
 '${xss(nft.creator)}'  )`;

    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};

const nftSelectSelective = (tokenIds) => {
    let tokenIdsStr = JSON.stringify(tokenIds);
    tokenIdsStr = tokenIdsStr.replace('[', '')
    tokenIdsStr = tokenIdsStr.replace(']', '')
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = ` select * from nft where tokenId in( ${xss(tokenIdsStr)})`;
    // console.log(sql)
    return exec(sql).then((rows) => {
        return rows || [];
    });
};

const nftSelectSelectiveStatus = (status) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    let collectAddress = "0xb47d88ffd09575bfe174ef1f91d0a7d483f066ad";
    const sql = ` SELECT nft.*, collect.type FROM nft RIGHT JOIN collect ON nft.collectAddress = collect.address WHERE status = ${status} and  collectAddress != '${xss(collectAddress)}' limit 50`;
    // const sql = ` SELECT nft.*, collect.type FROM nft RIGHT JOIN collect ON nft.collectAddress = collect.address WHERE status = ${status}  limit 50`;
    // console.log(sql)
    return exec(sql).then((rows) => {
        return rows || [];
    });
};

const nftSelectSelectiveCreator = (creator) => {
    // 用xss函数包裹一下传入的变量就好了，但是要注意，包裹之后的变量外面需要加一层引号，可以对比一下password和username两个地方
    const sql = ` select * from nft where creator = '${xss(creator)}'  order by id desc`;
    // console.log(sql)
    return exec(sql).then((rows) => {
        return rows[0] || null;
    });
};

module.exports = {
    login,
    nftSelectSelective,
    nftSelectSelectiveStatus,
    nftInsertSelective,
    nftPreInsertSelective,
    nftUpdateSelectiveStatus,
    nftUpdateSelective,
    nftUpdateSelectiveIsFinish,
    nftSelectSelectiveCreator,
    execSql,
    execSqlAll,
    accountUpdateSelective,
};
