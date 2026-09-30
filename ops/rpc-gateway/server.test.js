"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { afterEach, test } = require("node:test");
const { createGateway } = require("./server");

const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  })));
});

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

async function fixture() {
  const received = [];
  const upstream = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received.push(JSON.parse(body));
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(Array.isArray(received.at(-1))
      ? received.at(-1).filter((call) => call.id !== undefined).map((call) =>
        ({ jsonrpc: "2.0", id: call.id, result: call.method }))
      : { jsonrpc: "2.0", id: 1, result: "ok" }));
  });
  const upstreamUrl = await listen(upstream);
  const gatewayUrl = await listen(createGateway({ upstreamUrl }));
  return { gatewayUrl, received };
}

async function rpc(url, payload, headers = {}) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

test("public reads and signed raw transactions reach the upstream unchanged", async () => {
  const { gatewayUrl, received } = await fixture();
  for (const method of ["eth_blockNumber", "eth_getLogs", "eth_sendRawTransaction"]) {
    const payload = { jsonrpc: "2.0", id: 1, method, params: [] };
    const response = await rpc(gatewayUrl, payload);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result, "ok");
  }
  assert.deepEqual(received.map((value) => value.method), [
    "eth_blockNumber", "eth_getLogs", "eth_sendRawTransaction",
  ]);
});

test("account, admin, miner, debug, and engine methods never reach the upstream", async () => {
  const { gatewayUrl, received } = await fixture();
  for (const method of [
    "eth_accounts", "eth_sendTransaction", "eth_sign", "eth_signTransaction",
    "personal_listAccounts", "admin_nodeInfo", "miner_start",
    "debug_traceTransaction", "engine_exchangeCapabilities", "rpc_modules",
  ]) {
    const response = await rpc(gatewayUrl, { jsonrpc: "2.0", id: 1, method, params: [] });
    assert.equal((await response.json()).error.code, -32601, method);
  }
  assert.equal(received.length, 0);
});

test("a mixed batch executes safe members and rejects only unsafe members", async () => {
  const { gatewayUrl, received } = await fixture();
  const response = await rpc(gatewayUrl, [
    { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
    { jsonrpc: "2.0", id: 2, method: "eth_sendTransaction", params: [] },
  ]);
  const result = await response.json();
  assert.equal(result.length, 2);
  assert.equal(result.find((item) => item.id === 1).result, "eth_blockNumber");
  assert.equal(result.find((item) => item.id === 2).error.code, -32601);
  assert.deepEqual(received, [[{ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }]]);
});

test("blocked notifications do not produce a response or reach geth", async () => {
  const { gatewayUrl, received } = await fixture();
  const response = await rpc(gatewayUrl, { jsonrpc: "2.0", method: "personal_listAccounts", params: [] });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(received.length, 0);
});

test("browser preflight works and malformed JSON never reaches geth", async () => {
  const { gatewayUrl, received } = await fixture();
  const preflight = await fetch(gatewayUrl, { method: "OPTIONS", headers: { Origin: "https://example.net" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  const bad = await fetch(gatewayUrl, { method: "POST", body: "{" });
  assert.equal((await bad.json()).error.code, -32700);
  assert.equal(received.length, 0);
});

test("an oversized request is rejected before it can reach geth", async () => {
  const received = [];
  const upstream = http.createServer((request, response) => {
    received.push(request.url);
    response.end("unexpected");
  });
  const upstreamUrl = await listen(upstream);
  const gatewayUrl = await listen(createGateway({ upstreamUrl, maxBodyBytes: 64 }));
  const response = await rpc(gatewayUrl, {
    jsonrpc: "2.0", id: 1, method: "eth_call", params: ["x".repeat(100)],
  });
  assert.equal(response.status, 413);
  assert.equal(received.length, 0);
});

test("concurrent requests are capped while a slow upstream is pending", async () => {
  const releases = [];
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  const upstream = http.createServer((_request, response) => {
    releases.push(() => response.end('{"jsonrpc":"2.0","id":1,"result":"ok"}'));
    entered();
  });
  const upstreamUrl = await listen(upstream);
  const gatewayUrl = await listen(createGateway({ upstreamUrl, maxConcurrent: 1 }));
  const first = rpc(gatewayUrl, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
  await enteredPromise;
  const second = await Promise.race([
    rpc(gatewayUrl, { jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }).then((r) => r.status),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  releases.forEach((release) => release());
  assert.equal(second, 503);
  assert.equal((await (await first).json()).result, "ok");
});

test("upstream disconnect closes the downstream response promptly", async () => {
  const upstream = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write('{"jsonrpc":');
    setTimeout(() => response.socket.destroy(), 20);
  });
  const upstreamUrl = await listen(upstream);
  const gatewayUrl = await listen(createGateway({ upstreamUrl }));
  const outcome = new Promise((resolve) => {
    const request = http.request(gatewayUrl, { method: "POST", headers: { "Content-Type": "application/json" } },
      (response) => {
        response.resume();
        response.on("error", () => resolve("closed"));
        response.on("aborted", () => resolve("closed"));
        response.on("end", () => resolve(response.statusCode === 502 ? "closed" : "ended"));
      });
    request.on("error", () => resolve("closed"));
    request.end('{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}');
  });
  assert.equal(await Promise.race([outcome, new Promise((resolve) => setTimeout(() => resolve("hung"), 1200))]), "closed");
});
