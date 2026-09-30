# 草田链与浏览器生产恢复手册（2026-10-01）

## 现状与限制

- S2 `47.111.84.84` 是唯一验证者；geth 数据位于 `/data` 挂载目录。没有第二节点或已验证的异地链数据副本。若该数据永久丢失，现有条件无法保证恢复原链。
- S1 `47.111.91.203` 的浏览器主数据库目录是 `/data/ctnexploder/docker-compose/services/blockscout-db-data`，统计库目录是相邻的 `stats-db-data`。主库约 133 GB，S1 空闲空间不足以在本机保存完整副本。**当前没有已验证的完整数据库备份**。
- S1 的 `/root/ct-hardening-20261001-rollback/` 保存了主库和统计库的**结构文件**（`db-schema.dump`、`stats-db-schema.dump`），已用 `pg_restore -l` 检查可读取；它们不含业务数据，不能代替完整备份。
- 浏览器页面及索引数据库可以在链数据完好时尝试重建，但重建时间未测量；旧交易的历史追踪在当前 geth 状态下已出现 `required historical state unavailable`，重建后相关内部交易数据可能无法补齐。
- S2 geth 使用 Docker `json-file` 日志，现有容器未配置轮转。不可直接截断、移动或用 `copytruncate` 操作 Docker 正在写入的日志。原生日志轮转只对新建容器生效；重建当前容器会短暂中断唯一验证者，应在维护窗口并具备链数据备份后进行。
- 2026-10-01 为压低历史追踪失败产生的日志量，运行中的 geth 通过本机 `debug_verbosity(1)` 临时降为仅记录错误。此设置在 geth 重启后失效，重启后需检查日志增长与监控；恢复为默认信息级别可用同一 RPC 方法传入 `3`。这只改变日志级别，不能修复浏览器对旧交易追踪失败的根因。

## 发现异常时先保全证据

1. 记录时间、用户现象、S1/S2 可达性，不要先删数据或重建容器。
2. 查 `systemctl status ct-health@s1.service ct-health@s2.service`（分别在对应主机），以及 `journalctl -u ct-health@s1.service --since '-1 hour'` / S2 对应命令。
3. 查 S1 `systemctl status ct-rpc-gateway ct-port-guard@s1`、S2 `systemctl status ct-port-guard@s2`，并用 `docker ps` 检查容器是否运行。
4. 比较 S2 `eth_blockNumber` 与 S1 `https://browser.ctblock.cn/api/v2/blocks?type=block` 的最新高度。浏览器滞后不等于链停止。
5. 查 `df -h /` 和 geth 日志文件大小；保留原始日志，不在运行时直接处理 Docker 日志文件。

## 已部署防护的恢复

- S1 网关进程故障：先看 `journalctl -u ct-rpc-gateway -n 100 --no-pager`，确认私网 S2 `172.17.219.139:7401` 可达，然后执行 `systemctl restart ct-rpc-gateway`，再检查公开 RPC 的 `eth_blockNumber` 可用且 `rpc_modules` 返回 `-32601`。
- 端口防护丢失：在 S1 或 S2 执行 `/usr/local/sbin/ct-port-guard apply s1` 或 `apply s2`；刷新定时器为 `ct-port-guard-refresh@s1.timer` / `@s2.timer`。应从外部与私网两侧验证端口行为。
- S1 Nginx 配置回滚：原始三份 vhost 与原始防火墙规则快照位于 `/root/ct-hardening-20261001-rollback/`。`rollback_nginx.sh` 仅供紧急回退；执行后会重新向公网暴露高权限 geth RPC，因此应优先恢复网关服务，不应把此回退当作常规修复。
- 两台主机的 `ct-health@*.timer` 每五分钟只读检查，失败写入 systemd journal，不会自动重启生产服务，也没有外部通知通道。

## 数据恢复顺序

1. **链优先**：保全 S2 `/data` 与当前 geth 容器定义、镜像 digest。若磁盘故障但数据仍可读，先迁移到足量外部存储，验证文件完整性后再修复容器。绝不在唯一副本上执行初始化、清库或重同步。
2. **浏览器数据库**：优先从已验证的外部备份恢复。若没有备份而主库不可读，保全故障盘后才评估重新索引。重新索引无法保证恢复旧内部交易和统计历史；如有业务写入浏览器数据库，应单独核对。
3. **服务启动与核验**：先确认 geth 出块，再启动数据库和浏览器后端，最后核验浏览器高度、页面、公开 RPC 限权、私网统计任务、API。不要仅凭容器 `Up` 判断恢复完成。

## 取得备份空间后的优先工作

1. 为 S2 链数据与 S1 PostgreSQL 主库、统计库准备独立于两台服务器的存储，容量至少覆盖当前数据及增长、校验文件、保留多个版本。
2. 对数据库做一致性备份，对链数据做适合 geth 的停机或快照备份；记录容器镜像 digest、配置和恢复步骤。
3. 在隔离环境实际恢复并核对链高度、数据库表、浏览器索引。只有恢复演练通过，才称为可用备份。
4. 在维护窗口设置 geth 容器原生日志轮转并重建容器；重启后核验出块、账户与浏览器同步。
