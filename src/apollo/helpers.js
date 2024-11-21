const cursorBasedPagination = (keyArgs)=>
{
    return {
        keyArgs,

        merge(existing, incoming) {
            if (!existing) {
                return incoming;
            }

            const existingItems = existing.items || [];
            const incomingItems = incoming.items || [];

            return {
                ...incoming,
                items: existingItems?.concat(incomingItems),
            };
        },

        read(existing) {
            if (!existing) {
                return existing;
            }
            const {items} = existing;

            return {
                ...existing,
                items,
            };
        }
    };
}
const profilesManagedKeyFields = (profilesManaged) => {
    return `${profilesManaged.__typename}:${profilesManaged.address}`;
};

module.exports = {
    cursorBasedPagination,
    profilesManagedKeyFields
}
