// src/services/userService.js

const {fetchGraphQL} = require("./graphql");

function authentications(caddress) {
    let query
    let variables

    query = `
    query ($caddress:Bytes) {
      authentications(where:{caddress: $caddress}
        ) {
        id
        orderId
        saddress
        caddress
        authTime
        authExpiry
        longAuthExpiry
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `
    variables = {caddress: caddress}
    return fetchGraphQL(query, variables)
}
module.exports = {
    authentications
};
