const http = require("http");

const PORT = 8000;
// 测试接口
const serverHandle = require("../app");

const server = http.createServer(serverHandle);
server.listen(PORT);
