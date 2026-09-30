#!/bin/bash
set -euo pipefail

action="${1:-}"
role="${2:-}"
if [[ "$action" != apply && "$action" != rollback ]] || [[ "$role" != s1 && "$role" != s2 ]]; then
    echo "usage: ct-port-guard {apply|rollback} {s1|s2}" >&2
    exit 2
fi

rule() {
    local chain="$1"
    shift
    if [[ "$action" == apply ]]; then
        iptables -w 5 -C "$chain" "$@" 2>/dev/null || iptables -w 5 -I "$chain" 1 "$@"
    else
        while iptables -w 5 -C "$chain" "$@" 2>/dev/null; do
            iptables -w 5 -D "$chain" "$@"
        done
    fi
}

if [[ "$action" == apply ]]; then
    iptables -w 5 -S DOCKER-USER >/dev/null
    expected="172.17.219.137"
    [[ "$role" == s2 ]] && expected="172.17.219.139"
    ip -4 addr show dev eth0 | grep -q "$expected" || {
        echo "role $role does not match eth0 address" >&2
        exit 1
    }
fi

if [[ "$role" == s1 ]]; then
    # S2's hourly statistics job still connects to the main database on 7432.
    # The stats database on 7433 has no observed cross-host client.
    rule INPUT -i eth0 -p tcp --dport 7432 -m comment --comment ct-pg-main-deny -j REJECT
    rule INPUT -i eth0 -p tcp --dport 7432 -s 172.17.219.139/32 -m comment --comment ct-pg-s2-private -j ACCEPT
    rule INPUT -i eth0 -p tcp --dport 7432 -s 47.111.84.84/32 -m comment --comment ct-pg-s2-public -j ACCEPT
    rule INPUT -i eth0 -p tcp --dport 7433 -m comment --comment ct-pg-stats-deny -j REJECT

    rule DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 7432 -m comment --comment ct-pg-main-deny -j REJECT
    rule DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 7432 -s 172.17.219.139/32 -m comment --comment ct-pg-s2-private -j RETURN
    rule DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 7432 -s 47.111.84.84/32 -m comment --comment ct-pg-s2-public -j RETURN
    rule DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 7433 -m comment --comment ct-pg-stats-deny -j REJECT
else
    # Keep the explorer and other VPC clients, deny direct Internet RPC.
    rule INPUT -i eth0 -p tcp --dport 7401 ! -s 172.17.208.0/20 -m comment --comment ct-geth-public-deny -j REJECT
    rule DOCKER-USER -i eth0 -p tcp -m conntrack --ctorigdstport 7401 ! -s 172.17.208.0/20 -m comment --comment ct-geth-public-deny -j REJECT
fi
