// src/services/graphql.js

const axios = require('axios')

function fetchGraphQL(query, variables = {}) {
    const GRAPH_NODE_URL = 'https://graph-node.ctblock.cn/subgraphs/name/ctOraclePay'

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
        console.trace(error)
        console.error('Error fetching data:', error)
        throw error
    })
}

function fetchGraphQLEx(query, variables = {}) {
    const GRAPH_NODE_URL = 'https://ctblock.cn/graphiql'

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
        console.trace(error)
        console.error('Error fetching data:', error)
        throw error
    })
}

module.exports = {
    fetchGraphQL
};
