const ethUtil = require("ethereumjs-util");
const {RESPONSE_STATUS} = require("../chain/responseError");
const GlobalConfig = require("../config/GlobalConfig.json");

const {responseFunStr} = require("../mapper/account");
const {getPriKey} = require("../chain/accountProUtils");
const {PasswordError} = require("../chain/responseError");
const {findAccount} = require("../Orm/AccountService");
const {auth_user_v2} = require("../services/accountService");

/**
 * 查找数据库的未上传ipfs的铸造的请求, 然后来铸造.
 */
async function betchPreaprAuth(authAddress) {

    let nfts_ret = await findAccount({address: authAddress})

    let accountArr = null;
    if (nfts_ret.code !== 0) {
        console.trace(responseFunStr(RESPONSE_STATUS.ERROR, nfts_ret.err, {}));
    } else {
        accountArr = nfts_ret.result
    }
    try {

        // 判断用户密码是否正确
        // 判断接入方用户名密码
        let c_decWalletResult = await getPriKey(accountArr, accountArr.psd);
        let c_wallet;
        if (c_decWalletResult.err != null) {
            console.trace(PasswordError)
        } else {
            c_wallet = c_decWalletResult.result;

            let cardId = "123456789012345678"
            let result02 = await auth_user_v2(c_wallet, cardId)
            console.log(result02)
        }

    } catch (e) {
        console.trace(e);
    }
    console.log("betchPreaprAuth All Done!");

}

betchPreaprAuth("0xFe6AcF30e5E1f8d05f47533bE66Fa1335074AFec");
// LOCAL
// betchPreaprAuth("0x1d517aa4a3a5f489b9cF5fD58A80C08F54Ad8fB6");

// node src\task\accountPreparAuth.js
// https://ctblock.cn/address/0x709bBc0aD7581D02244E00C356d0EFcbC79AE9f3/write-contract  // 添加白名单
