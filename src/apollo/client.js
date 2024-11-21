const { ApolloClient, from } = require("@apollo/client");
const cache = require("./cache");
const httpLink = require("./httpLink");

const apolloClient = () =>
  new ApolloClient({
    cache,
    connectToDevTools: true,
    link: from([httpLink])
  });

module.exports = apolloClient;
