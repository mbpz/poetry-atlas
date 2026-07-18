# 数据流水线

当前数据流水线以仓库中的 `public/data/places.json` 为规范数据，以 Supabase 为唯一运行时数据库。本文只描述已经存在、可执行的流程；本地数据库与 Docker 不在范围内。

## 数据流

```text
places.json
    │
    ├── npm run check:data
    │
    ├── npm run seed:data -- --prune
    │       └── Supabase: places / poems / poem_places / authors
    │
    └── npm run check:database
            ├── OpenAPI 结构与 RPC 合约
            ├── 本地与远端逐字段一致性
            ├── 作者派生统计
            └── 匿名只读权限
```

## 规范数据格式

每个地点包含：

- `id`：稳定、唯一的文本 ID
- `name`、`type`、`lng`、`lat`
- `ancient_names`：可选古地名数组；seed 会把缺省值写为空数组
- `poems`：与该地点关联的诗词数组

每首诗包含 `title`、`author`、`dynasty`、`content`。同标题、同作者视为同一首诗；它可以关联多个地点，但不同地点中的正文和朝代必须一致。

当前基线：

| 数据 | 数量 |
| --- | ---: |
| 地点 | 89 |
| 唯一诗词 | 323 |
| 诗词地点关系 | 340 |

## 本地质量检查

```bash
npm run check:data
```

该命令检查：

- 地点 ID、类型、坐标、古地名和空地点
- 诗词朝代是否可映射
- 未明确标记的过短正文、乱码和同诗异文
- 重点完整正文回归样本
- 89/323/340 基线数量

确需收录节选时，标题应包含“（节选）”，或设置 `contentStatus: "excerpt"`。

## 正文修复

`scripts/repair_poem_content.mjs` 可使用固定版本的外部语料生成匹配报告。先预览，确认后再写入：

```bash
npm pack chinese-poetry@2.0.1 --pack-destination /tmp
mkdir -p /tmp/chinese-poetry
tar -xzf /tmp/chinese-poetry-2.0.1.tgz -C /tmp/chinese-poetry

npm run repair:data -- --corpus /tmp/chinese-poetry/package/dist --drop-unmatched
npm run repair:data -- --corpus /tmp/chinese-poetry/package/dist --drop-unmatched --write
npm run check:data
```

自动修复只接受高置信匹配；不能可靠补全的内容不得猜测。

## 同步 Supabase

先在 Supabase SQL Editor 执行 `supabase/migrations/` 中尚未应用的迁移。然后在未跟踪的 `.env.local` 或 `.env` 中配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

执行全量规范同步：

```bash
npm run seed:data -- --prune
```

seed 会：

1. 写入所有地点字段，包括类型与古地名。
2. 按 `(title, author)` upsert 唯一诗词，并写入 `dynasty_id`。
3. upsert 诗词地点关系。
4. `--prune` 时删除规范数据外的关系、诗词和地点。
5. 从同步后的数据库重建至少有 3 首诗的作者统计，并清除过期作者。

`--prune` 面向完全由该仓库管理的数据集。生产执行前应先保留 Supabase 备份。

## 远端一致性检查

```bash
npm run check:database
```

该命令使用 Secret key 读取 Supabase OpenAPI 与数据，并使用 anon key 验证公开合约。它会在以下任一情况返回非零退出码：

- 表字段或 `search_poems` RPC 与迁移合约不一致
- 地点、诗词、关系或古地名与 `places.json` 不一致
- `dynasty_id`、作者数量或作者统计错误
- 匿名读取失败、搜索古地名失败，或匿名写入未被阻止

检查不会输出密钥；匿名写入测试使用应被 RLS 拒绝的临时 ID，若异常成功会立即用服务端权限清理并报告失败。

## 发布顺序

```bash
npm run check:data
npm run typecheck
npm run lint
npm run build
# 在 Supabase SQL Editor 应用迁移
npm run seed:data -- --prune
npm run check:database
```

CI 运行不依赖数据库密钥的前四项。远端迁移、seed 和一致性检查由有权限的维护者执行。
