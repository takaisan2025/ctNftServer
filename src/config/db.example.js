const env = process.env.NODE_ENV;
let MYSQL_CONFIG = {};

if (env === "dev" || true) {
  MYSQL_CONFIG = {
    host: "",
    user: "",
    password: "",
    port: "",
    database: "",
    charset:""
  };
}
module.exports = {
  MYSQL_CONFIG,
};
