import type {CodegenConfig} from "@graphql-codegen/cli";
const GlobalConfig = require("./src/config/GlobalConfig.json");

const config: CodegenConfig = {
    config: {
        inlineFragmentTypes: "combine"
    },
    customFetch: "node-fetch",
    documents: "./src/documents/**/*.graphql",
    generates: {
        "./src/generated/graphql.ts": {
            plugins: [
                "typescript",
                "typescript-operations",
                "typescript-react-apollo"
            ]
        }
    },
    hooks: {
        // afterAllFileWrite: ["biome format --write ."]
    },
    overwrite: true,
    schema: GlobalConfig.EX_API_URL
};

export default config;
