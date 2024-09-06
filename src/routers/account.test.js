const {parentauths_v2} = require("../services/accountService");
const GlobalConfig = require("../config/GlobalConfig.json");
async function test() {
    let authData = await parentauths_v2("0x637d71e819058a36b423dd1Ab67Fe66CeA9a4B6E", GlobalConfig.AUTH_CONTROLLER_SYSTEM_ADDRESS);
    console.log(authData.data.isAuth)

}
test()
