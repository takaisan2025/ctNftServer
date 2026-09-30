"use strict";

const http = require("node:http");

// Only methods which do not ask Geth to sign, unlock, administer, or mine.
// The explorer indexer uses the private RPC connection for trace methods.
const PUBLIC_METHODS = new Set([
  "eth_blockNumber", "eth_call", "eth_chainId", "eth_coinbase",
  "eth_estimateGas", "eth_feeHistory", "eth_gasPrice",
  "eth_getBalance", "eth_getBlockByHash", "eth_getBlockByNumber",
  "eth_getBlockTransactionCountByHash", "eth_getBlockTransactionCountByNumber",
  "eth_getCode", "eth_getFilterChanges", "eth_getFilterLogs", "eth_getLogs",
  "eth_getProof", "eth_getStorageAt", "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex", "eth_getTransactionByHash",
  "eth_getTransactionCount", "eth_getTransactionReceipt",
  "eth_getUncleByBlockHashAndIndex", "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash", "eth_getUncleCountByBlockNumber",
  "eth_hashrate", "eth_mining", "eth_maxPriorityFeePerGas",
  "eth_newBlockFilter", "eth_newFilter", "eth_newPendingTransactionFilter",
  "eth_protocolVersion", "eth_sendRawTransaction", "eth_syncing",
  "eth_uninstallFilter", "net_listening", "net_peerCount", "net_version",
  "web3_clientVersion", "web3_sha3",
]);

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: ["string", "number"].includes(typeof id) ? id : null,
    error: { code, message } };
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function createGateway({ upstreamUrl, timeoutMs = 15000, maxBodyBytes = 1024 * 1024,
  maxConcurrent = 16, maxMixedResponseBytes = 2 * 1024 * 1024 }) {
  if (!upstreamUrl) throw new Error("upstreamUrl is required");
  const upstream = new URL(upstreamUrl);
  if (upstream.protocol !== "http:") throw new Error("upstream must use private HTTP");
  let inFlight = 0;

  return http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
      });
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, rpcError(null, -32600, "POST required"));
      return;
    }
    if (inFlight >= maxConcurrent) {
      sendJson(response, 503, rpcError(null, -32000, "RPC gateway busy"));
      return;
    }
    inFlight++;
    response.once("close", () => { inFlight--; });
    if (Number(request.headers["content-length"]) > maxBodyBytes) {
      sendJson(response, 413, rpcError(null, -32600, "Request too large"));
      return;
    }

    let chunks = [];
    let size = 0;
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > maxBodyBytes) {
          sendJson(response, 413, rpcError(null, -32600, "Request too large"));
          return;
        }
        chunks.push(chunk);
      }
    } catch {
      if (!response.writableEnded) sendJson(response, 400, rpcError(null, -32700, "Invalid request body"));
      return;
    }

    const body = Buffer.concat(chunks);
    chunks = null;
    let payload;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch {
      sendJson(response, 400, rpcError(null, -32700, "Parse error"));
      return;
    }
    const batch = Array.isArray(payload);
    const calls = batch ? payload : [payload];
    if (calls.length === 0 || calls.length > 100 || calls.some((call) =>
      !call || typeof call !== "object" || Array.isArray(call) ||
      call.jsonrpc !== "2.0" || typeof call.method !== "string")) {
      sendJson(response, 400, rpcError(null, -32600, "Invalid request"));
      return;
    }
    const allowed = calls.filter((call) => PUBLIC_METHODS.has(call.method));
    const denied = calls.filter((call) => !PUBLIC_METHODS.has(call.method));
    const errors = denied.filter((call) => Object.hasOwn(call, "id"))
      .map((call) => rpcError(call.id, -32601, "Method not found"));
    if (allowed.length === 0) {
      if (errors.length === 0) response.writeHead(204, { "Access-Control-Allow-Origin": "*" }).end();
      else sendJson(response, 200, batch ? errors : errors[0]);
      return;
    }

    const upstreamBody = denied.length === 0 ? body : Buffer.from(JSON.stringify(allowed));
    const upstreamRequest = http.request(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": upstreamBody.length },
    }, (upstreamResponse) => {
      if (response.writableEnded) { upstreamResponse.resume(); return; }
      const fail = () => {
        if (response.writableEnded || response.destroyed) return;
        if (response.headersSent) response.destroy();
        else sendJson(response, 502, rpcError(null, -32000, "RPC upstream unavailable"));
      };
      upstreamResponse.on("aborted", fail);
      upstreamResponse.on("error", fail);
      upstreamResponse.on("close", () => { if (!upstreamResponse.complete) fail(); });
      if (denied.length === 0) {
        response.writeHead(upstreamResponse.statusCode || 502, {
          "Content-Type": upstreamResponse.headers["content-type"] || "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        upstreamResponse.pipe(response);
        return;
      }
      const parts = [];
      let bytes = 0;
      upstreamResponse.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > maxMixedResponseBytes) upstreamResponse.destroy(new Error("RPC response too large"));
        else parts.push(chunk);
      });
      upstreamResponse.on("end", () => {
        if (response.writableEnded || response.destroyed) return;
        try {
          const raw = Buffer.concat(parts).toString("utf8");
          const upstreamResults = raw ? JSON.parse(raw) : [];
          const results = (Array.isArray(upstreamResults) ? upstreamResults : [upstreamResults]).concat(errors);
          if (results.length === 0) response.writeHead(204, { "Access-Control-Allow-Origin": "*" }).end();
          else sendJson(response, 200, results);
        } catch { fail(); }
      });
    });
    upstreamRequest.setTimeout(timeoutMs, () => upstreamRequest.destroy(new Error("RPC upstream timeout")));
    upstreamRequest.on("error", () => {
      if (response.writableEnded || response.destroyed) return;
      if (!response.headersSent) sendJson(response, 502, rpcError(null, -32000, "RPC upstream unavailable"));
      else response.destroy();
    });
    response.once("close", () => {
      if (!response.writableEnded) upstreamRequest.destroy();
    });
    upstreamRequest.end(upstreamBody);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 18741);
  const server = createGateway({ upstreamUrl: process.env.UPSTREAM_URL });
  server.listen(port, "127.0.0.1", () => console.log(`RPC gateway on 127.0.0.1:${port}`));
}

module.exports = { createGateway, PUBLIC_METHODS };
