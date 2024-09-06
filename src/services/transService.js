// src/services/userService.js

const {fetchGraphQLEx} = require("./graphql");

function transaction(hash) {
    let query
    let variables

    query = `
    query ($hash:FullHash) {
      transaction(
        hash: $hash
      ) {
        hash
        blockNumber
        value
        gasUsed
        error
        status
      }
    }
  `
    variables = {hash: hash}
    return fetchGraphQLEx(query, variables)
}

module.exports = {
    transaction
};
