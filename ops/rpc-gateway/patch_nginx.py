"""Prepare the S1 Nginx RPC routes; run nginx -t before reloading."""

import os
import re
import shutil
import sys
import tempfile
from pathlib import Path


CONFIG_DIR = Path("/www/server/panel/vhost/nginx")
BACKUP_DIR = Path("/root/ct-hardening-20261001-rollback")
COUNTS = {
    "browser.ctblock.cn.conf": 2,
    "ctblock.cn.conf": 2,
    "tools.ctblock.cn.conf": 1,
}
DIRECT = re.compile(r"(?m)^([ \t]*)proxy_pass[ \t]+http://172\.17\.219\.139:7401/;[ \t]*$")
FILTERED = re.compile(r"(?m)^[ \t]*proxy_pass[ \t]+http://\$ct_rpc_target/;[ \t]*$")


def render(source, expected):
    patched, count = DIRECT.subn(r"\1proxy_pass http://$ct_rpc_target/;", source)
    if count == expected:
        return patched
    if count == 0 and len(FILTERED.findall(source)) == expected:
        return source
    raise ValueError("Unexpected RPC proxy count: direct=%d filtered=%d expected=%d" %
                     (count, len(FILTERED.findall(source)), expected))


def apply():
    if not BACKUP_DIR.is_dir():
        raise RuntimeError("Rollback directory must exist before patching")
    outputs = {}
    for name, expected in COUNTS.items():
        path = CONFIG_DIR / name
        original = path.read_text(encoding="utf-8")
        outputs[path] = render(original, expected)
        backup = BACKUP_DIR / name
        if not backup.exists():
            shutil.copy2(str(path), str(backup))
            os.chmod(str(backup), 0o600)

    map_path = CONFIG_DIR / "00-ct-rpc-map.conf"
    map_content = (Path(__file__).parent / "00-ct-rpc-map.conf").read_text(encoding="utf-8")
    if map_path.exists() and map_path.read_text(encoding="utf-8") != map_content:
        raise RuntimeError("Existing RPC map differs from planned content")

    for path, content in outputs.items():
        if path.read_text(encoding="utf-8") == content:
            continue
        stat = path.stat()
        fd, temp = tempfile.mkstemp(prefix="ct-rpc-", dir=str(CONFIG_DIR))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                stream.write(content)
            os.chmod(temp, stat.st_mode)
            os.chown(temp, stat.st_uid, stat.st_gid)
            os.replace(temp, str(path))
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
    if not map_path.exists():
        shutil.copy2(str(Path(__file__).parent / "00-ct-rpc-map.conf"), str(map_path))
        os.chmod(str(map_path), 0o644)


if __name__ == "__main__":
    if sys.argv[1:] != ["--apply"]:
        raise SystemExit("usage: python3 patch_nginx.py --apply")
    apply()
