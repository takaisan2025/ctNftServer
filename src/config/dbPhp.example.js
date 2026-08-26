const env = process.env.NODE_ENV;
let MYSQL_CONFIG_PHP = {};

if (env === "dev" || true) {
  MYSQL_CONFIG_PHP = {
    host: "",
    user: "",
    password: "",
    port: "",
    database: "",
    charset:"utf8mb4"
  };
}
module.exports = {
  MYSQL_CONFIG_PHP,
};
