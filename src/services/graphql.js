// src/services/graphql.js

const axios = require('axios')
const GRAPH_NODE_URL = 'https://graph-node.ctblock.cn/subgraphs/name/ctOraclePay'

 function fetchGraphQL(query, variables = {}) {
  return axios.post(GRAPH_NODE_URL, {
    query: query,
    variables: variables
  }).then(response => {
    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors)
      throw new Error('GraphQL error occurred')
    }
    return response.data.data
  }).catch(error => {
    console.error('Error fetching data:', error)
    throw error
  })
}
module.exports = {
  fetchGraphQL
};
