#!/bin/sh
set -eu

backup=/root/ct-hardening-20261001-rollback
config=/www/server/panel/vhost/nginx
for name in browser.ctblock.cn.conf ctblock.cn.conf tools.ctblock.cn.conf; do
    cp -a "$backup/$name" "$config/$name"
done
rm -f "$config/00-ct-rpc-map.conf"
nginx -t
systemctl reload nginx
