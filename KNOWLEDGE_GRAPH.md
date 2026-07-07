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

## 4.1 关系型存储（PostgreSQL）

简单关系与知识图谱边表（Phase 1–3 使用）：

```sql
-- 知识图谱节点
CREATE TABLE "KnowledgeGraphNode" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,    -- poem/author/place/dynasty/event/tag
  entity_id UUID NOT NULL,
  label VARCHAR(200),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- 知识图谱边
CREATE TABLE "KnowledgeGraphEdge" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES "KnowledgeGraphNode"(id),
  target_id UUID NOT NULL REFERENCES "KnowledgeGraphNode"(id),
  relation VARCHAR(100) NOT NULL,
  weight DECIMAL(5,4) DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 复合索引
CREATE INDEX idx_kg_edge_relation ON "KnowledgeGraphEdge"(relation);
CREATE INDEX idx_kg_edge_source ON "KnowledgeGraphEdge"(source_id);
CREATE INDEX idx_kg_edge_target ON "KnowledgeGraphEdge"(target_id);

-- 节点索引
CREATE INDEX idx_kg_node_type ON "KnowledgeGraphNode"(entity_type);
```

## 4.2 图数据库存储（Phase 4+，可选）

当关系复杂度超过关系型数据库承载后，迁移到图数据库：

| 方案 | 说明 |
| ---- | ---- |
| **Neo4j** | 原生图数据库、Cypher 查询、可视化 |
| **Apache AGE** | PostgreSQL 扩展、复用现有 PG |
| **Nebula Graph** | 分布式、国内生态 |

```cypher
// Neo4j 示例
CREATE (libai:Author {name:'李白', dynasty:'唐'})
CREATE (place:Place {name:'黄鹤楼', lng:114.3, lat:30.5})
CREATE (poem:Poem {title:'黄鹤楼送孟浩然之广陵'})
CREATE (libai)-[:AUTHORED]->(poem)
CREATE (poem)-[:FAREWELL_AT]->(place)

// 查询：与黄鹤楼相关的所有人物
MATCH (p:Place {name:'黄鹤楼'})<-[:FAREWELL_AT|WRITTEN_AT]-(poem:AUTHORED)-[]->(author:Author)
RETURN author, poem
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

## 6.1 关系查询

```sql
-- 查询：李白的所有朋友
SELECT a2.name
FROM "KnowledgeGraphEdge" e
JOIN "KnowledgeGraphNode" n1 ON n1.id = e.source_id AND n1.entity_type = 'author'
JOIN "KnowledgeGraphNode" n2 ON n2.id = e.target_id AND n2.entity_type = 'author'
JOIN "Author" a1 ON a1.id = n1.entity_id
JOIN "Author" a2 ON a2.id = n2.entity_id
WHERE a1.name = '李白' AND e.relation = 'FRIEND_OF';
```

## 6.2 路径查询（Neo4j Cypher）

```cypher
// 查询李白到辛弃疾的最短文学影响路径
MATCH p = shortestPath(
  (a1:Author {name:'李白'})-[:INFLUENCED_BY|FRIEND_OF*]-(a2:Author {name:'辛弃疾'})
)
RETURN p
```

## 6.3 推荐查询

```cypher
// 推荐与用户浏览地点相关的其他地点
MATCH (p:Place {name:'黄鹤楼'})<-[:DESCRIBES]-(poem:Poem)-[:DESCRIBES]->(related:Place)
WHERE related.name <> '黄鹤楼'
RETURN related.name, count(*) AS score
ORDER BY score DESC
LIMIT 10
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
| KG-4 | M5 | 迁移 Neo4j / AGE + 复杂查询 |
| KG-5 | V2 | AI 自动知识发现 + 关系推理 |
