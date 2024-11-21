const {InMemoryCache} = require('@apollo/client');
const {cursorBasedPagination, profilesManagedKeyFields} = require('./helpers');

const createProfilesFieldPolicy = () => {
    return cursorBasedPagination(['request', ['where']]);
};

const cache = new InMemoryCache({
    typePolicies: {
        ProfilesManagedResult: {keyFields: profilesManagedKeyFields},
        Query: {
            fields: {
                profiles: createProfilesFieldPolicy(),
            }
        }
    }
});

module.exports = cache
