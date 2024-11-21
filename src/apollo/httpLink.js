const {HttpLink} = require("@apollo/client");
const GlobalConfig = require("../config/GlobalConfig.json");
const fetch = require("node-fetch");
const httpLink = new HttpLink({
    fetch,
    fetchOptions: "no-cors",
    uri: GlobalConfig.EX_API_URL
});

module.exports = httpLink
