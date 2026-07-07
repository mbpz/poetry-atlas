# 数据库设计（DATABASE.md）

> Poetry Atlas of China — 数据模型与 ER 关系

---

# 一、设计原则

1. **空间优先**：以 `Place` 作为核心关联节点，所有实体通过地点建立空间关系
2. **时序可溯**：时间维度精确到年，支持朝代聚合与逐年回溯
3. **考据友好**：对存疑的地点/年份引入 `confidence` 可信度字段
4. **古今一体**：古地名与现代地名在同一表中共存，通过 `modern_name` 与 `period` 区分
5. **扩展性**：预留 JSONB 元数据字段，应对未来不确定需求

---

# 二、ER 关系图（文字版）

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Dynasty  │1───N│  Author  │1───N│   Poem   │
│ 朝代      │     │ 作者      │     │ 诗词      │
└──────────┘     └──────────┘     └──────────┘
                                       │  N:M
                                       │
                                  ┌────┴─────┐
                                  │ PoemPlace│
                                  │ 诗词地点  │
                                  │ 关联      │
                                  └────┬─────┘
                                       │ N:1
                                       │
┌──────────┐                      ┌────┴─────┐
│  Tag     │ N:M             N:1  │  Place   │
│ 标签      │──────────────────────│ 地点      │
└──────────┘                      └──────────┘
                                       │ 1:N（自引用）
                                       │
                                  ┌────┴───────────┐
                                  │ HistoricalEvent│
                                  │ 历史事件        │
                                  └────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Image   │ N:1 │  Quote   │ N:1 │ TravelRoute  │
│ 图片      │     │ 名句      │     │ 旅行路线      │
└──────────┘     └──────────┘     └──────────────┘
```

---

# 三、核心表结构

---

## 3.1 Dynasty（朝代）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| name | VARCHAR(50) | UNIQUE NOT NULL | 朝代名称（唐、宋…） |
| name_en | VARCHAR(50) | | 英文名 |
| start_year | INTEGER | NOT NULL | 起始年份（-221 表示公元前） |
| end_year | INTEGER | NOT NULL | 结束年份 |
| capital | VARCHAR(100) | | 首都 |
| description | TEXT | | 简介 |
| sort_order | INTEGER | NOT NULL | 时间排序码 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 3.2 Author（作者）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| name | VARCHAR(100) | NOT NULL | 姓名 |
| courtesy_name | VARCHAR(100) | | 字 |
| art_name | VARCHAR(100) | | 号 |
| dynasty_id | UUID | FK → Dynasty | 所属朝代 |
| birth_year | INTEGER | | 出生年（负数表示公元前） |
| death_year | INTEGER | | 卒年 |
| birth_place_id | UUID | FK → Place | 籍贯/出生地 |
| biography | TEXT | | 生平简介 |
| avatar_url | TEXT | | 头像 |
| poem_count | INTEGER | DEFAULT 0 | 收录诗词数（冗余，便于排序） |
| wikidata_id | VARCHAR(50) | | 外部知识库 ID |
| metadata | JSONB | | 扩展字段 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**索引**：`name`、`dynasty_id`、`birth_place_id`

---

## 3.3 Poem（诗词）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| content | TEXT | NOT NULL | 正文 |
| author_id | UUID | FK → Author | 作者 |
| dynasty_id | UUID | FK → Dynasty | 朝代 |
| year | INTEGER | | 创作年份 |
| year_note | VARCHAR(200) | | 年份考据备注 |
| annotation | TEXT | | 注释 |
| translation | TEXT | | 现代译文 |
| appreciation | TEXT | | 赏析 |
| genre | VARCHAR(50) | | 体裁（诗/词/曲/赋） |
| form | VARCHAR(50) | | 形式（七律/五绝/词牌名…） |
| source | VARCHAR(500) | | 出处 |
| popularity | INTEGER | DEFAULT 0 | 热度评分 |
| metadata | JSONB | | 扩展字段 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**索引**：`title`、`author_id`、`dynasty_id`、`year`、全文搜索向量（GIN）
**分区策略**：可按 `dynasty_id` 水平分区

---

## 3.4 Place（地点）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| name | VARCHAR(100) | NOT NULL | 地名 |
| name_en | VARCHAR(200) | | 英文名/拼音 |
| name_alias | TEXT[] | | 别名数组 |
| type | PLACE_TYPE | NOT NULL | 地点类型枚举 |
| period | VARCHAR(50) | | 时期标记（现代/唐代/宋代…） |
| modern_name | VARCHAR(100) | | 对应现代地名 |
| parent_id | UUID | FK → Place（自引用） | 父级地点 |
| longitude | DECIMAL(10,7) | NOT NULL | 经度 |
| latitude | DECIMAL(10,7) | NOT NULL | 纬度 |
| geom | GEOMETRY(Point, 4326) | | PostGIS 几何对象 |
| description | TEXT | | 地点介绍 |
| dynasty_start | VARCHAR(50) | | 首次出现的朝代 |
| poem_count | INTEGER | DEFAULT 0 | 关联诗词数（冗余） |
| region_path | LTREE | | 层级路径（中国.湖北.武汉…） |
| metadata | JSONB | | 扩展字段 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**地点类型枚举（PLACE_TYPE）**：

```sql
CREATE TYPE place_type AS ENUM (
  'city',           -- 城市
  'mountain',       -- 山岳
  'river',          -- 河流
  'lake',           -- 湖泊
  'temple',         -- 寺庙
  'tower',          -- 楼阁
  'ancient_city',   -- 古城
  'county',         -- 县
  'province',       -- 省
  'historic_site',  -- 历史遗址
  'pass',           -- 关隘
  'bridge'          -- 桥梁
);
```

**索引**：`GIST(geom)` 空间索引、`parent_id`、`LTREE` 路径索引、`name`、`type + period`

---

## 3.5 PoemPlace（诗词-地点关联）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| poem_id | UUID | FK → Poem | 诗词 |
| place_id | UUID | FK → Place | 地点 |
| relation_type | RELATION_TYPE | NOT NULL | 关系类型 |
| confidence | DECIMAL(3,2) | DEFAULT 1.00 | 关联可信度（0–1） |
| note | TEXT | | 考据备注 |
| sort_order | INTEGER | DEFAULT 0 | 显示排序 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**关系类型枚举（RELATION_TYPE）**：

```sql
CREATE TYPE poem_place_relation AS ENUM (
  'creation',     -- 创作地
  'description',  -- 描写地
  'passing',      -- 经过地
  'farewell',     -- 送别地
  'destination',  -- 目的地
  'origin',       -- 出发地
  'reference',    -- 引用地（典故中提及）
  'residence'     -- 居住地
);
```

**索引**：`UNIQUE(poem_id, place_id, relation_type)`、`place_id + relation_type`

> 💡 这是整个知识库的**最核心关联表**。一首诗可能涉及多个地点（送别诗有出发地与目的地），同时通过 `confidence` 保留考据争议空间。

---

## 3.6 Tag（标签/意象）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | 主键 |
| name | VARCHAR(50) | UNIQUE NOT NULL | 标签名（月亮/柳树/酒…） |
| type | TAG_TYPE | NOT NULL | 类型 |
| description | TEXT | | 简介 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Tag 类型枚举**：`imagery`（意象）、`theme`（主题）、`emotion`（情感）、`season`（季节）、`object`（器物）。

---

## 3.7 PoemTag（诗词-标签关联）

| 字段 | 类型 | 约束 |
| ---- | ---- | ---- |
| poem_id | UUID | FK → Poem |
| tag_id | UUID | FK → Tag |
| weight | DECIMAL(3,2) | DEFAULT 1.00 |

**主键**：`(poem_id, tag_id)`

---

## 3.8 HistoricalEvent（历史事件）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | |
| name | VARCHAR(200) | NOT NULL | 事件名（安史之乱…） |
| start_year | INTEGER | | 开始年 |
| end_year | INTEGER | | 结束年 |
| dynasty_id | UUID | FK → Dynasty | |
| place_id | UUID | FK → Place | 主要发生地 |
| description | TEXT | | |
| related_poem_ids | UUID[] | | 关联诗词 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 3.9 TravelRoute（旅行路线）

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | UUID | PK | |
| author_id | UUID | FK → Author | 作者 |
| name | VARCHAR(200) | NOT NULL | 路线名（李白长江行…） |
| description | TEXT | | |
| place_ids | UUID[] | NOT NULL | 途经地点有序数组 |
| year_range | INT4RANGE | | 时间范围 |
| geom | GEOMETRY(LineString, 4326) | | 路线几何 |
| is_ai_generated | BOOLEAN | DEFAULT FALSE | 是否 AI 生成 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 3.10 Image（图片）

| 字段 | 类型 | 约束 |
| ---- | ---- | ---- |
| id | UUID | PK |
| entity_type | VARCHAR(50) | NOT NULL（poem/author/place） |
| entity_id | UUID | NOT NULL |
| url | TEXT | NOT NULL |
| caption | VARCHAR(500) | |
| source | VARCHAR(200) | |
| sort_order | INTEGER | DEFAULT 0 |

**索引**：`(entity_type, entity_id)`

---

## 3.11 Quote（名句）

| 字段 | 类型 | 约束 |
| ---- | ---- | ---- |
| id | UUID | PK |
| poem_id | UUID | FK → Poem |
| content | VARCHAR(500) | NOT NULL |
| popularity | INTEGER | DEFAULT 0 |

---

## 3.12 Idiom（成语）

| 字段 | 类型 | 约束 |
| ---- | ---- | ---- |
| id | UUID | PK |
| phrase | VARCHAR(50) | UNIQUE NOT NULL |
| source_poem_id | UUID | FK → Poem |
| meaning | TEXT | |

---

## 3.13 Source（出处/文献来源）

| 字段 | 类型 | 约束 |
| ---- | ---- | ---- |
| id | UUID | PK |
| title | VARCHAR(200) | NOT NULL |
| type | VARCHAR(50) |（数据库/古籍/网站…） |
| url | TEXT | |
| description | TEXT | |

---

## 3.14 KnowledgeGraphNode / KnowledgeGraphEdge（知识图谱）

```
KnowledgeGraphNode
├── id (UUID, PK)
├── entity_type (VARCHAR)  -- poem/author/place/event/tag
├── entity_id   (UUID)     -- 对应实体 ID
├── label       (VARCHAR)
└── properties  (JSONB)

KnowledgeGraphEdge
├── id         (UUID, PK)
├── source_id  (UUID)  -- KnowledgeGraphNode
├── target_id  (UUID)  -- KnowledgeGraphNode
├── relation   (VARCHAR)  -- created_at / described / influenced_by ...
├── weight     (DECIMAL)
└── properties (JSONB)
```

---

# 四、核心查询场景与索引策略

> **数据库使用 Supabase（PostgreSQL + PostGIS + pgvector + RLS）**，ORM 使用 **Drizzle**。

| 查询场景 | 索引方案 |
| -------- | -------- |
| 按地点查诗词全覆盖 | `PoemPlace(place_id, relation_type)` + `Poem` 全文索引 |
| 按朝代聚合统计 | `Poem(dynasty_id)` + 物化视图定时刷新 |
| 空间范围查询（"附近有什么诗"） | `Place GIST(geom)` + PostGIS `ST_DWithin` |
| 层级下钻（省→市→县） | `Place.region_path` 的 `LTREE` 索引 |
| 作者轨迹 | `TravelRoute` 的 `geom` + `author_id` |
| 名句全文检索 | `Poem` 表 GIN 全文索引（Postgres 内置中文分词） |
| 意象网络查询 | `PoemTag JOIN Tag`（关系型查询，无需图数据库） |
| 语义搜索 | `pgvector` 向量列 + HNSW 索引 |

---

# 五、数据量估算（初期）

| 实体 | 初期数量 | 3 年目标 |
| ---- | -------- | -------- |
| Poem | 5 万首 | 30 万首 |
| Author | 5,000 人 | 2 万人 |
| Place | 3,000 个 | 1 万个 |
| PoemPlace | 15 万条 | 100 万条 |
| Tag | 500 个 | 2,000 个 |
| Tag 关联 | 50 万条 | 300 万条 |
| Image | 2 万张 | 20 万张（存 Cloudflare R2） |

> **存储预算**：结构化数据预估 ~150MB（含索引），远低于 Supabase Free 500MB 限额。图片通过 Cloudflare R2 存储，不计入数据库配额。

---

# 六、技术栈对齐

| 能力 | 方案 | 理由 |
| ---- | ---- | ---- |
| 主数据库 | **Supabase PostgreSQL**（500MB 免费） | 零运维、内置 Auth/Storage/Realtime |
| 空间扩展 | **PostGIS**（Supabase 内置） | 免费、满足所有空间查询 |
| 向量搜索 | **pgvector**（Supabase 支持） | 无需额外部署 |
| ORM | **Drizzle ORM** | 轻量、Serverless 友好、Server Components 兼容 |
| 全文搜索 | **Postgres GIN + 中文分词** | 几十万数据无需外部搜索引擎 |
| 对象存储 | **Cloudflare R2** | 免费出口、图片/JSON 备份 |
| 行级安全 | **Supabase RLS** | 零代码实现数据权限 |
| 认证 | **Supabase Auth** | 免费 50k 用户/月 |

---

# 七、扩展方向（遵循 Vercel-Free 约束）

1. **后续可升级至 Supabase Pro**（$25/月，8GB 数据库），前端代码零改动
2. **向量搜索升级**：如 pgvector 性能不足，可接入 **Supabase pgvector HNSW 索引**
3. **搜索升级**：如 Postgres 全文搜索不足，可接入 **Algolia Free Tier**（10k 文档）
4. **知识图谱**：复杂图查询可借此在 PostgreSQL 内通过递归 CTE 实现，**无需 Neo4j**
5. **时序分析**：时间维度增长后，使用 **Supabase 分区表**（原生 PG 能力）
6. **物化视图**：朝代×地点×作者三维统计立方体，通过 GitHub Actions 定时刷新
