#!/usr/bin/env python3
"""Read-only production checks. Exits nonzero so systemd records failures."""

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request


def get_json(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode("ascii")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)


def rpc(url, method, params=None):
    result = get_json(url, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []})
    return result


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def service_active(name):
    return subprocess.run(["systemctl", "is-active", "--quiet", name], timeout=5).returncode == 0


def disk_ok():
    usage = shutil.disk_usage("/")
    return usage.free >= 15 * 1024 ** 3 and usage.free / usage.total >= 0.08


def check_recent_block(url):
    block = rpc(url, "eth_getBlockByNumber", ["latest", False]).get("result") or {}
    timestamp = int(block["timestamp"], 16)
    age = time.time() - timestamp
    check(-30 <= age <= 120, "chain head is {:.0f} seconds old".format(age))


def check_s1():
    check(service_active("ct-rpc-gateway"), "RPC gateway stopped")
    check(service_active("ct-port-guard@s1"), "S1 port guard stopped")
    gateway = "http://127.0.0.1:18741/"
    head = rpc(gateway, "eth_blockNumber")
    check(isinstance(head.get("result"), str), "gateway cannot read chain head")
    check_recent_block(gateway)
    denied = rpc(gateway, "rpc_modules")
    check(denied.get("error", {}).get("code") == -32601, "privileged RPC became public")
    explorer = get_json("https://browser.ctblock.cn/api/v2/blocks?type=block")
    items = explorer.get("items") or []
    check(items and isinstance(items[0].get("height"), int), "explorer block API unavailable")
    lag = int(head["result"], 16) - items[0]["height"]
    check(-2 <= lag <= 30, "explorer lag {} blocks".format(lag))
    check(disk_ok(), "S1 disk space below safety threshold")
    print("OK S1 head={} explorer={} lag={}".format(int(head["result"], 16), items[0]["height"], lag))


def check_s2():
    check(service_active("ct-port-guard@s2"), "S2 port guard stopped")
    rpc_url = "http://127.0.0.1:7401/"
    head = rpc(rpc_url, "eth_blockNumber")
    check(isinstance(head.get("result"), str), "geth cannot read chain head")
    check_recent_block(rpc_url)
    mining = rpc(rpc_url, "eth_mining")
    check(mining.get("result") is True, "validator not mining")
    check(disk_ok(), "S2 disk space below safety threshold")
    log_path = subprocess.check_output(
        ["docker", "inspect", "geth-1", "--format", "{{.LogPath}}"], timeout=5
    ).decode().strip()
    check(log_path.startswith("/var/lib/docker/containers/"), "unexpected geth log path")
    log_bytes = os.stat(log_path).st_size
    check(log_bytes < 6 * 1024 ** 3, "geth log reached 6 GiB; schedule rotation via container recreation")
    print("OK S2 head={} geth_log_bytes={}".format(int(head["result"], 16), log_bytes))


if __name__ == "__main__":
    try:
        if sys.argv[1:] == ["s1"]:
            check_s1()
        elif sys.argv[1:] == ["s2"]:
            check_s2()
        else:
            raise ValueError("usage: ct_health.py {s1|s2}")
    except Exception as exc:
        print("FAIL {}: {}".format(sys.argv[1:] or ["?"], exc), file=sys.stderr)
        sys.exit(1)
