# 数据库设计

本项目运行时只使用 Supabase。当前范围不包含本地数据库、Docker、Drizzle、PostGIS 或 pgvector。

数据库结构、约束、索引、搜索函数与 RLS 的唯一来源是
`supabase/migrations/`。历史零散 SQL 不再作为可执行文档保留。

## 数据关系

```text
dynasties 1 ── N poems N ── N places
                       poem_places

authors ──(按 poems.author 派生)── author_routes
```

## 当前结构

### `places`

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | text | 主键，与 `places.json` 一致 |
| `name` | text | 非空 |
| `type` | text | 非空，受地点类型检查约束 |
| `lng` / `lat` | numeric | 非空，WGS-84 经纬度 |
| `ancient_names` | text[] | 非空，默认空数组 |
| `created_at` | timestamptz | 非空，默认当前时间 |

地点类型为：`city`、`tower`、`mountain`、`lake`、`temple`、`pass`、
`river`、`bridge`、`garden`、`palace`。

### `poems`

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `title` / `author` | text | 非空，二者组合唯一 |
| `dynasty` | text | 非空，保留规范数据中的中文朝代 |
| `dynasty_id` | text | 非空，外键到 `dynasties.id` |
| `content` | text | 非空 |
| `created_at` | timestamptz | 非空，默认当前时间 |

当前产品没有 `annotation`、`translation`、`appreciation` 字段。若将来需要，必须先补充规范数据、迁移、API 合约与 UI，再单独实施。

### `poem_places`

`(poem_id, place_id)` 为联合主键，两个字段分别外键到 `poems` 和 `places`，删除主体时级联删除关系。`relation_type` 当前统一为 `description`。

### `dynasties`

朝代使用稳定文本 ID。规范数据中的 `三国`、`晋`、`魏晋` 都映射到 `wei_jin`；
`金` 独立映射到 `jin`，不与 `晋` 混用。

### `authors` 与 `author_routes`

`authors` 是派生数据，只保留至少有 3 首诗的作者。`poem_count` 按唯一诗词记录计数，
`place_count` 按作者关联的不同地点计数。seed 每次从数据库中的 `poems` 和
`poem_places` 重算这些字段，并删除不再满足条件的作者。

`author_routes` 是只读视图，按作者和地点聚合诗词数量。

## 搜索合约

`search_poems(keyword, type_filter, dynasty_filter)` 返回：

- `id`、`title`、`author`、`dynasty`、`dynasty_id`、`content`
- `places`：关联地点的 JSON 数组

搜索覆盖标题、作者、正文、现代地名和古地名；地点类型和朝代 ID 可独立过滤。

## 权限

核心表全部启用 RLS。`anon` 和 `authenticated` 仅能读取核心表、视图并执行
`search_poems`；写入只允许服务端 Secret/Service Role key。Secret key 只能放在未跟踪的环境文件或部署平台 Secret 中，不能使用公开 anon key 替代。

## 变更与验证

1. 新建按时间排序的 `supabase/migrations/*.sql`，不要修改已在线执行的历史迁移。
2. 在 Supabase SQL Editor 执行迁移。
3. 运行 `npm run seed:data -- --prune`。
4. 运行 `npm run check:database`，确认结构、规范数据、作者统计、搜索与匿名权限完全一致。

规范数据的当前基线为 89 个地点、323 首唯一诗词和 340 条诗词地点关系。
