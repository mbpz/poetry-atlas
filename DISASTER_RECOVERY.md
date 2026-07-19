# 数据容灾与备份方案

状态：已实现。本文面向当前只使用 Supabase、且不引入本地数据库或 Docker 的运行架构。

## 目标

| 指标 | 当前目标 |
| --- | --- |
| RPO（最多可丢失数据） | 24 小时；每日北京时间 03:17 自动备份 |
| RTO（恢复到验证通过） | 当前数据规模下 60 分钟内 |
| Actions 制品保留 | 90 天滚动恢复点 |
| 长期保留 | `database-backups` 分支的 Git 提交历史 |
| 恢复验证 | 每次备份都校验并执行零写入恢复演练 |

如果产品出现高频用户写入，24 小时 RPO 将不再合适，应启用 Supabase PITR 或改用具备事务快照的 `pg_dump`。Supabase 官方说明付费计划具有不同天数的每日平台备份，PITR 可提供更细粒度恢复；本方案不假设当前套餐一定包含这些能力。

## 容灾副本

当前形成跨 Supabase 与 GitHub 两个服务的三份副本：

1. **在线副本**：Supabase 生产数据库。
2. **可重建副本**：`main` 分支中的 `public/data/places.json` 与 `supabase/migrations/`。
3. **完整逻辑快照**：每日 GitHub Actions 制品，以及 `database-backups` 分支的长期提交历史。

GitHub Actions 制品在公开仓库最多保留 90 天，因此不能作为唯一长期副本。备份分支每天正常追加提交，不做强制覆盖，历史版本可按 commit 恢复。
`database-backups` 已启用分支保护，禁止删除与 force-push；备份工作流只做普通追加提交。

## 备份范围

逻辑快照包含：

- `dynasties`
- `places`
- `poems`
- `poem_places`
- `authors`（包括生卒年、字号、传记等非派生字段）

`author_routes` 视图、`search_poems` 函数、索引、约束和 RLS 不重复导出，由版本化 migration 恢复。manifest 会记录每个 migration 的 SHA-256，防止用错误版本的结构恢复数据。

当前应用没有 Supabase Auth 用户或 Storage 对象，因此不包含它们。未来若启用这些功能必须扩展本方案；尤其 Supabase 数据库备份只包含 Storage 元数据，不包含 Storage API 管理的实际对象。

本仓库与数据均为公开内容，因此 `database-backups` 分支可以公开。若将来引入个人信息、私有内容或密钥，必须停止发布明文备份分支，改为加密后写入独立私有对象存储。

## 自动备份流程

`.github/workflows/database-backup.yml` 每日执行：

1. 运行 `npm run check:database`，拒绝备份结构或派生数据已漂移的数据库。
2. 连续读取两次五张表；只有所有表的指纹相同才接受快照，最多尝试三轮。
3. 生成逐表 JSON、`manifest.json` 和 `SHA256SUMS`。
4. 校验逐表 SHA-256、字段集合、主键唯一性、外键、作者统计和 migration 校验和。
5. 运行 `restore:database` 默认 dry-run，证明快照可解析并可形成恢复计划。
6. 上传 90 天 Actions artifact。
7. 更新 `database-backups/latest/` 并提交到长期备份分支。

工作流只允许定时或手动触发，不在 PR 上运行，避免向不可信代码暴露 Service Role key。需要以下 GitHub Actions Secrets：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 本地命令

创建并立即校验一份快照（输出目录已在 `.gitignore`）：

```bash
npm run backup:database
```

指定目录并复核 migration：

```bash
npm run backup:database -- --output /tmp/poetry-atlas-backup
npm run backup:verify -- \
  --input /tmp/poetry-atlas-backup \
  --check-migrations \
  --max-age-hours 24
```

任何文件被修改后，其 SHA-256 或快照指纹都会使校验失败。

## 恢复手册

默认优先恢复到一个新 Supabase 项目，避免在事故调查完成前覆盖唯一现场。

1. 暂停写入并记录事故时间、影响范围和目标恢复点。
2. 从 `database-backups` 分支选择 commit，或下载对应 Actions artifact。
3. 检查快照：

   ```bash
   npm run backup:verify -- --input <backup-directory>
   npm run restore:database -- --input <backup-directory>
   ```

   第二条命令默认是 dry-run，不连接或写入数据库。

4. 新建 Supabase 项目，在 SQL Editor 按顺序执行 `supabase/migrations/`。
5. 将本地环境变量临时指向新项目，并再次确认项目 ref。
6. 写入并逐表回读验证：

   ```bash
   npm run restore:database -- \
     --input <backup-directory> \
     --apply \
     --confirm-project-ref <new-project-ref>
   ```

7. 如果目标库不是空库，工具会拒绝继续。确认要精确删除快照之外的数据后，增加 `--prune`。
8. 只有在必须原地恢复时才增加 `--allow-in-place`；它仍要求精确输入生产项目 ref。
9. 完成后运行：

   ```bash
   npm run check:database
   npm run check:data
   npm run typecheck
   npm run lint
   npm run build
   ```

10. 实测地点、朝代、作者、搜索 API 后，再切换部署环境变量或解除维护状态。

恢复不是单个数据库事务；中途失败可以使用同一快照幂等重跑。任何指纹不一致都视为恢复失败，不能切流。

## 演练与告警

- 每日工作流失败由 GitHub Actions 通知维护者；失败当天必须人工补跑。
- 每月抽查 `database-backups` 最新 manifest、行数和提交时间。
- 每季度在临时 Supabase 项目做一次真实恢复，记录耗时，验证 RPO/RTO。
- 表结构、表名、私有数据类型或存储方式变化时，同时更新备份契约与本手册。

## 平台边界

Supabase 项目被删除时，其平台内备份也会一起永久删除，因此跨服务快照是必要的。官方同时指出数据库备份不恢复已删除的 Storage 实际对象。参考：

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI Backup and Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [GitHub Actions artifact retention](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization)
