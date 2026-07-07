# 知识图谱设计（KNOWLEDGE_GRAPH.md）

> Poetry Atlas of China — 中国诗词时空知识图谱

---

# 一、图谱愿景

> 将中国古诗词中分散的**作者、作品、地点、事件、意象**编织成一张可查询、可推理、可探索的知识网络。

---

# 二、本体设计（Ontology）

## 2.1 实体类型（Nodes）

| 实体 | 类型标识 | 核心属性 | 数量级 |
| ---- | -------- | -------- | ------ |
| 诗词 | `Poem` | title, content, year, genre, form | 5万+ |
| 作者 | `Author` | name, dynasty, birth_place, biography | 5000+ |
| 地点 | `Place` | name, type, longitude, latitude | 3000+ |
| 朝代 | `Dynasty` | name, start_year, end_year | 15 |
| 历史事件 | `HistoricalEvent` | name, start_year, end_year, place | 300+ |
| 意象/标签 | `Tag` | name, type (imagery/theme/emotion) | 500+ |
| 名句 | `Quote` | content, poem_ref | 2万+ |
| 文献来源 | `Source` | title, type, url | 100+ |

## 2.2 关系类型（Edges）

### 人物关系

| 关系 | 说明 | 示例 |
| ---- | ---- | ---- |
| `FRIEND_OF` | 朋友 | 李白 ↔ 杜甫 |
| `MENTOR_OF` | 师徒/提携 | 欧阳修 → 苏轼 |
| `FAMILY` | 亲属 | 苏轼 ↔ 苏辙 |
| `RIVAL` | 文学/政治对手 | 王安石 ↔ 司马光 |
| `INFLUENCED_BY` | 文学影响 | 杜甫 → 白居易 |

### 作品关系

| 关系 | 说明 | 示例 |
| ---- | ---- | ---- |
| `AUTHORED_BY` | → 作者 | 《将进酒》→ 李白 |
| `BELONGS_TO_DYNASTY` | → 朝代 | 《将进酒》→ 唐 |
| `WRITTEN_AT` | → 地点（创作地） | 《登岳阳楼》→ 岳阳楼 |
| `DESCRIBES` | → 地点（描写） | 《早发白帝城》→ 白帝城 |
| `FAREWELL_AT` | → 地点（送别地） | 《黄鹤楼送孟浩然》→ 黄鹤楼 |
| `MENTIONS_EVENT` | → 历史事件 | 《石壕吏》→ 安史之乱 |
| `HAS_TAG` | → 意象/边塞诗 | 《将进酒》→ 酒 |

### 地点关系

| 关系 | 说明 | 示例 |
| ---- | ---- | ---- |
| `MODERN_NAME_OF` | 古→今地名 | 长安 → 西安 |
| `LOCATED_IN` | 子→父地点 | 黄鹤楼 → 武汉 |
| `NEARBY` | 空间相邻 | 岳阳楼 ↔ 洞庭湖 |
| `IS_CAPITAL_OF` | 首都 | 长安 → 唐 |

### 事件关系

| 关系 | 说明 | 示例 |
| ---- | ---- | ---- |
| `HAPPENED_AT` | → 地点 | 安史之乱 → 长安 |
| `RELATED_TO` | → 人物 | 安史之乱 → 杜甫 |
| `INSPIRED` | → 作品 | 安史之乱 → 《春望》 |

---

# 三、图谱示例（局部）

```
                  FRIEND_OF
       李白 ────────────── 杜甫
        │ ╲                  │
        │  ╲ AUTHORED_BY     │ AUTHORED_BY
        ▼   ▼                ▼
    《黄鹤楼送          《春望》────DESCRIBES──▶ 长安
     孟浩然》                 │
        │                    │ MENTIONS_EVENT
        │ FAREWELL_AT        ▼
        ▼             安史之乱──HAPPENED_AT──▶ 幽州
     黄鹤楼                ▲
        │                  │ RELATED_TO
    LOCATED_IN            郭子仪
        ▼
     武汉
        │
    LOCATED_IN
        ▼
     湖北
        │
    LOCATED_IN
        ▼
     中国
```

---

# 四、存储方案

> **约束**：遵循 `ARCHITECTURE.md` 的 **Zero-Ops First** 原则。**不引入外部图数据库**，全部使用 **Supabase PostgreSQL + 递归 CTE + pgvector** 实现。

## 4.1 关系型存储（Drizzle Schema + Supabase）

知识图谱节点与边均存储在 PostgreSQL 中，使用 Drizzle ORM 定义：

```typescript
// db/schema/knowledgeGraph.ts
import { pgTable, uuid, varchar, jsonb, timestamp, decimal, index } from 'drizzle-orm/pg-core';

// 知识图谱节点（统一存储所有实体引用）
export const knowledgeGraphNode = pgTable('knowledge_graph_node', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),   // poem/author/place/dynasty/event/tag
  entityId: uuid('entity_id').notNull(),
  label: varchar('label', { length: 200 }),
  properties: jsonb('properties').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  typeIdx: index('kg_node_type_idx').on(t.entityType),
  uniqueEntity: unique().on(t.entityType, t.entityId),
}));

// 知识图谱边（存储实体间关系）
export const knowledgeGraphEdge = pgTable('knowledge_graph_edge', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => knowledgeGraphNode.id),
  targetId: uuid('target_id').notNull().references(() => knowledgeGraphNode.id),
  relation: varchar('relation', { length: 100 }).notNull(),      // FRIEND_OF / AUTHORED / WRITTEN_AT ...
  weight: decimal('weight', { precision: 5, scale: 4 }).default('1.0'),
  properties: jsonb('properties').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  relationIdx: index('kg_edge_relation_idx').on(t.relation),
  sourceIdx: index('kg_edge_source_idx').on(t.sourceId),
  targetIdx: index('kg_edge_target_idx').on(t.targetId),
}));
```

## 4.2 路径查询（PostgreSQL 递归 CTE）

> **不需要图数据库**。PostgreSQL 内置的递归 CTE 已能高效处理多层关系查询。

```sql
-- 查询：与李白有 2 跳以内关系的全部人物（朋友的朋友）
WITH RECURSIVE poe AS (
  -- 起点：李白
  SELECT kn.id, kn.entity_id, 0 AS depth, ARRAY[kn.id] AS path
  FROM knowledge_graph_node kn
  WHERE kn.entity_type = 'author'
    AND kn.entity_id = (SELECT id FROM author WHERE name = '李白')
  
  UNION ALL
  
  -- 递归：通过边扩展到相邻节点
  SELECT kn2.id, kn2.entity_id, poe.depth + 1, poe.path || kg2.target_id
  FROM poe
  JOIN knowledge_graph_edge kg2 ON kg2.source_id = poe.id
  JOIN knowledge_graph_node kn2 ON kn2.id = kg2.target_id
  WHERE poe.depth < 3                          -- 最大 3 跳
    AND NOT kn2.id = ANY(poe.path)             -- 避免循环
    AND kn2.entity_type = 'author'
)
SELECT DISTINCT a.name, a.dynasty, poe.depth
FROM poe
JOIN author a ON a.id = poe.entity_id
WHERE poe.depth > 0
ORDER BY poe.depth
LIMIT 50;
```

## 4.3 语义搜索（pgvector）

推荐系统的"相似诗词"查询通过 pgvector 实现：

```sql
-- 查找与某首诗词语义相近的诗词
SELECT p.title, p.content, 1 - (pe.embedding <=> :query_embedding) AS similarity
FROM poem_embedding pe
JOIN poem p ON p.id = pe.poem_id
WHERE 1 - (pe.embedding <=> :query_embedding) > 0.7
ORDER BY similarity DESC
LIMIT 20;
```

---

# 五、知识抽取流程

```
┌────────────┐     ┌────────────┐     ┌──────────────┐
│            │     │  NER /     │     │  关系        │
│  原始文本   │────▶│  实体识别   │────▶│  抽取        │
│  (诗词/     │     │  (地点/     │     │  (规则 +     │
│   注释)     │     │   人物)     │     │   LLM)       │
└────────────┘     └────────────┘     └──────┬───────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │  人工审核    │
                                      │  (编辑平台)  │
                                      └──────────────┘
```

### 抽取策略

| 抽取类型 | 方法 | 置信度 |
| -------- | ---- | ------ |
| 地点实体 | 规则库（古地名词典）+ LLM 校验 | 高 |
| 人物关系 | LLM 阅读传记文本抽取 | 中 |
| 创作地 | 诗题/注释中显式标记 | 高 |
| 送别地 | 诗题中"送""别"关键词 + 内容分析 | 中 |
| 历史事件 | LLM 标注 + 权威史料对照 | 中 |
| 意象 | 标签库 + LLM 判定 | 高 |

---

# 六、查询能力

## 6.1 关系查询（通过 Drizzle）

```typescript
// lib/db/repositories/knowledgeGraph.ts
export async function getFriends(authorName: string) {
  return db.select({ name: author.name })
    .from(knowledgeGraphEdge)
    .innerJoin(knowledgeGraphNode as n1, eq(n1.id, knowledgeGraphEdge.sourceId))
    .innerJoin(knowledgeGraphNode as n2, eq(n2.id, knowledgeGraphEdge.targetId))
    .innerJoin(author as a1, eq(a1.id, n1.entityId))
    .innerJoin(author as a2, eq(a2.id, n2.entityId))
    .where(and(
      eq(a1.name, authorName),
      eq(knowledgeGraphEdge.relation, 'FRIEND_OF')
    ));
}
```

## 6.2 路径查询（PostgreSQL 递归 CTE）

```typescript
// lib/db/query.ts
export async function findPath(fromAuthor: string, toAuthor: string) {
  return db.execute(sql`
    WITH RECURSIVE path AS (
      SELECT kn.id, kn.entity_id AS author_id, 1 AS depth, ARRAY[kn.id] AS visited
      FROM knowledge_graph_node kn
      JOIN author a ON a.id = kn.entity_id
      WHERE a.name = ${fromAuthor}
      
      UNION ALL
      
      SELECT kn2.id, kn2.entity_id, path.depth + 1, path.visited || kg.target_id
      FROM path
      JOIN knowledge_graph_edge kg ON kg.source_id = path.id
      JOIN knowledge_graph_node kn2 ON kn2.id = kg.target_id
      WHERE path.depth < 5
        AND NOT kn2.id = ANY(path.visited)
    )
    SELECT a.name, a.dynasty, path.depth
    FROM path
    JOIN author a ON a.id = path.author_id
    WHERE a.name = ${toAuthor}
    ORDER BY path.depth
    LIMIT 1
  `);
}
```

## 6.3 推荐查询（静态预计算）

```typescript
// 推荐与用户浏览地点相关的其他地点（离线预计算，存 public/data/related-places.json）
export async function getRelatedPlaces(placeId: string): Promise<RelatedPlace[]> {
  const res = await fetch(`/data/related-places/${placeId}.json`);
  return res.json();
}
```

---

# 七、图谱可视化（前端）

| 工具 | 用途 |
| ---- | ---- |
| **D3.js** | 力导向网络、关系图 |
| **ECharts Graph** | 中文支持好、开箱即用 |
| **Cytoscape.js** | 知识图谱专业可视化 |
| **Deck.gl + MapLibre** | 地理空间叠加 |

## 7.1 可视化模式

1. **作者关系网络**：节点=作者，连线=关系（朋友/师生/影响）
2. **地点诗词网络**：节点=地点+诗词，连线=描写/创作/经过
3. **意象网络**：节点=意象，连线=共现关系
4. **时间网络**：节点=朝代/事件，连线=时间流
5. **混合图谱**：多实体叠加、支持筛选

---

# 八、知识图谱的 AI 应用

| 场景 | 输入 | 输出 |
| ---- | ---- | ---- |
| 智能问答 | "李白为什么去黄鹤楼？" | 结合历史语境的回答 |
| 相似推荐 | 用户浏览《将进酒》 | 推荐《蜀道难》《行路难》 |
| 主题发现 | "江南三大名楼" | 黄鹤楼、岳阳楼、滕王阁专题 |
| 影响分析 | "杜甫影响了谁？" | 受影响诗人列表 + 诗作 |
| 关联发现 | 任意两个实体 | 最短路径、共同邻居 |

---

# 九、Milestone

| 阶段 | 时间 | 目标 |
| ---- | ---- | ---- |
| KG-1 | M2 | 基础关系抽取入库（作者-作品-地点） |
| KG-2 | M3 | 人物关系网络上线 |
| KG-3 | M4 | 历史事件关联 + 图谱可视化 |
| KG-4 | M4 | 递归 CTE 路径查询 + pgvector 语义推荐 |
| KG-5 | V2 | AI 自动知识发现 + 关系推理 |
