const profilesManagedKeyFields = (profilesManaged) => {
    return `${profilesManaged.__typename}:${profilesManaged.address}`;
};
module.exports = profilesManagedKeyFields
