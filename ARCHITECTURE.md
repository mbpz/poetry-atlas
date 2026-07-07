# 系统架构设计（ARCHITECTURE.md）

> Poetry Atlas of China — 整体技术架构

---

# 一、架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐   │
│   │  Web App │   │ Mobile H5│   │  Admin   │   │  MCP Client  │   │
│   │ (Next.js)│   │ (Next.js)│   │  Panel   │   │ (Claude/Cursor)│  │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘   │
└────────┼──────────────┼──────────────┼───────────────┼────────────┘
         │              │              │               │
         ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Gateway Layer                                │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Nginx / Traefik (TLS / Rate Limit / Static Cache)          │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Service Layer                                │
│                                                                     │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│   │  API Server  │   │  Map Tile    │   │  AI Service          │   │
│   │  (NestJS /   │   │  Server      │   │  (FastAPI /          │   │
│   │   FastAPI)   │   │  (Martin /   │   │   LangGraph)         │   │
│   │              │   │   Tegola)    │   │                      │   │
│   └──────┬───────┘   └──────────────┘   └──────────┬───────────┘   │
│          │                                          │               │
│   ┌──────┴──────────────────────────────────────────┴───────────┐   │
│   │                    Message Queue (Redis / NATS)             │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                   │
│   ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ PostgreSQL │  │   Redis    │  │ OpenSearch│  │ Object Store │  │
│   │ + PostGIS  │  │  (Cache)   │  │  (Search) │  │ (MinIO / R2) │  │
│   └────────────┘  └────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 二、前端架构

## 2.1 技术栈

| 模块 | 选型 | 说明 |
| ---- | ---- | ---- |
| 框架 | Next.js 15 (App Router) | SSR/SSG/ISR 混合渲染 |
| 语言 | TypeScript 5 | 严格模式 |
| UI 组件 | shadcn/ui + Radix | 无头组件，可定制 |
| 样式 | TailwindCSS 4 | 原子化 CSS |
| 状态管理 | Zustand + React Query | 轻量 + 服务端状态 |
| 地图引擎 | MapLibre GL JS | 开源、矢量渲染 |
| 数据可视化 | Deck.gl | 热力图、轨迹、3D |
| 动画 | Framer Motion | 过渡与微交互 |
| 国际化 | next-intl | 中/英双语 |

## 2.2 目录结构

```
web/
├── app/                      # Next.js App Router
│   ├── (main)/
│   │   ├── page.tsx          # 首页（全屏地图）
│   │   ├── map/
│   │   ├── place/[id]/
│   │   ├── poem/[id]/
│   │   ├── author/[id]/
│   │   └── search/
│   ├── (admin)/
│   │   └── admin/
│   ├── api/                  # BFF 层（可选）
│   └── layout.tsx
├── components/
│   ├── map/                  # 地图组件
│   │   ├── ChinaMap.tsx
│   │   ├── BubbleLayer.tsx
│   │   ├── HeatmapLayer.tsx
│   │   ├── TrajectoryLayer.tsx
│   │   └── PoetryCloudLayer.tsx
│   ├── ui/                   # shadcn 基础组件
│   ├── poem/                 # 诗词相关组件
│   ├── place/                # 地点相关组件
│   └── layout/               # 布局组件
├── lib/
│   ├── api/                  # API 客户端
│   ├── hooks/                # 自定义 hooks
│   ├── utils/
│   └── constants/
├── stores/                   # Zustand stores
├── styles/
├── types/                    # 全局类型
└── public/
    ├── fonts/
    └── tiles/                # 离线瓦片（可选）
```

## 2.3 关键设计

### 地图状态管理

```typescript
// stores/mapStore.ts
interface MapState {
  center: [number, number];
  zoom: number;
  dynasty: string | null;        // 当前朝代筛选
  authorId: string | null;       // 当前作者筛选
  mode: 'bubble' | 'heatmap' | 'cloud' | 'trajectory';
  selectedPlace: Place | null;
  timelineRange: [number, number];
  // actions...
}
```

### 数据获取策略

| 页面 | 策略 | 说明 |
| ---- | ---- | ---- |
| 首页地图 | ISR + 客户端增量 | 静态骨架 + 动态瓦片 |
| 地点详情 | SSR | SEO 友好 |
| 诗词详情 | SSR | SEO 友好 |
| 搜索 | 客户端请求 | 实时交互 |
| 管理后台 | 客户端 SPA | 无需 SEO |

---

# 三、后端架构

## 3.1 技术栈

| 模块 | 选型 | 说明 |
| ---- | ---- | ---- |
| 主服务 | NestJS 10 (Node.js 22) | 模块化、装饰器、生态成熟 |
| 备选 | FastAPI (Python) | AI 团队偏好 |
| ORM | Prisma / Drizzle | 类型安全 |
| 验证 | Zod / class-validator | 运行时校验 |
| 缓存 | Redis 7 | 数据缓存 + 会话 + 队列 |
| 搜索 | OpenSearch 2.x | 全文 + 聚合 |
| 任务队列 | BullMQ (Redis) | 数据导入、AI 任务 |
| 日志 | Pino + Loki | 结构化日志 |
| 监控 | Prometheus + Grafana | 指标 + 告警 |

## 3.2 目录结构（NestJS）

```
server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/                  # 公共模块
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── modules/
│   │   ├── poem/                # 诗词模块
│   │   ├── author/              # 作者模块
│   │   ├── place/               # 地点模块
│   │   ├── dynasty/             # 朝代模块
│   │   ├── search/              # 搜索模块
│   │   ├── tag/                 # 标签/意象模块
│   │   ├── event/               # 历史事件模块
│   │   ├── route/               # 旅行路线模块
│   │   ├── image/               # 图片模块
│   │   ├── knowledge-graph/     # 知识图谱模块
│   │   ├── ai/                  # AI 能力模块
│   │   ├── auth/                # 认证模块
│   │   ├── admin/               # 管理后台模块
│   │   └── upload/              # 上传模块
│   ├── prisma/                  # Prisma schema
│   ├── jobs/                    # 后台任务
│   └── mcp/                     # MCP Server
├── test/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
└── Dockerfile
```

## 3.3 API 设计原则

- RESTful 为主，复杂查询开放 GraphQL
- 版本化：`/api/v1/...`
- 统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 538
  }
}
```

- 错误码规范：

| 范围 | 含义 |
| ---- | ---- |
| 0 | 成功 |
| 1xxx | 参数错误 |
| 2xxx | 认证/授权 |
| 3xxx | 资源不存在 |
| 4xxx | 业务逻辑 |
| 5xxx | 服务器内部 |

---

# 四、地图服务架构

## 4.1 瓦片服务

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  开源底图     │     │  Martin /    │     │  PostGIS     │
│  (OpenStreet  │────▶│  Tegola      │◀────│  (MVT 生成)  │
│   Map / 高德) │     │  MVT Server  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

- **底图**：OpenStreetMap（开源）/ 高德/天地图（国内合规）
- **矢量瓦片**：Martin（Rust，高性能）或 Tegola（Go）
- **数据源**：PostGIS 动态生成 MVT（Mapbox Vector Tiles）
- **缓存**：CDN + Redis 瓦片缓存

## 4.2 地图数据流

```
用户操作（缩放/拖拽/筛选）
        │
        ▼
  前端计算视口范围 (bounds)
        │
        ▼
  API: GET /api/v1/places?bbox=...&dynasty=...&zoom=...
        │
        ▼
  PostGIS 空间查询 + 聚合
        │
        ▼
  返回 GeoJSON / MVT
        │
        ▼
  MapLibre GL 渲染（气泡/热力/轨迹）
```

---

# 五、AI 服务架构

## 5.1 服务拆分

```
┌─────────────────────────────────────────────────────────┐
│                     AI Service (FastAPI)                 │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Poem       │  │  Place      │  │  Travel         │ │
│  │  Analyzer   │  │  Narrator   │  │  Planner        │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│  ┌──────┴────────────────┴───────────────────┴────────┐ │
│  │              LangGraph Agent Orchestrator           │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │         LLM Provider Abstraction Layer             │ │
│  │   DeepSeek / Qwen / GLM / Claude / GPT / Gemini   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 5.2 AI 能力矩阵

| 能力 | 输入 | 输出 | 模型 |
| ---- | ---- | ---- | ---- |
| 诗词解析 | 原诗 | 白话/典故/情感/关键词 | DeepSeek / Qwen |
| 地点解读 | 地点+关联诗词 | 文化背景故事 | Claude / GPT |
| 意象分析 | 意象词 | 相关诗词网络 | 任意 LLM |
| 旅行规划 | 作者/地点/主题 | 路线+配诗 | LangGraph Agent |
| 智能问答 | 自然语言 | 结构化回答 | RAG + LLM |
| 语音朗读 | 诗词文本 | 音频流 | TTS（CosyVoice / Edge TTS） |
| 地图生成 | 作者/事件 | 动画地图参数 | LLM + 模板 |

## 5.3 RAG 流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Poem    │────▶│ Embedding│────▶│ pgvector │
│  Place   │     │ (bge-    │     │ /        │
│  Author  │     │  m3)     │     │ OpenSearch│
└──────────┘     └──────────┘     └──────────┘
                                       ▲
                                       │
┌──────────┐     ┌──────────┐     ┌────┴─────┐
│  User    │────▶│ Query    │────▶│ Semantic │
│  Query   │     │ Rewrite  │     │ Search   │
└──────────┘     └──────────┘     └──────────┘
```

---

# 六、存储架构

| 数据类型 | 存储方案 | 说明 |
| -------- | -------- | ---- |
| 结构化数据 | PostgreSQL 16 + PostGIS | 主库 |
| 缓存 | Redis 7 | 热点数据、会话、排行榜 |
| 全文搜索 | OpenSearch 2.x | 诗词/作者/地点搜索 |
| 向量检索 | pgvector / OpenSearch kNN | 语义搜索 |
| 图片/音频 | MinIO / Cloudflare R2 | 对象存储 |
| 静态资源 | CDN（Cloudflare / 阿里云） | 加速分发 |
| 日志 | Loki + S3 | 低成本日志存储 |

---

# 七、部署架构

## 7.1 开发环境

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
  redis:
    image: redis:7-alpine
  opensearch:
    image: opensearchproject/opensearch:2
  minio:
    image: minio/minio
```

## 7.2 生产架构

```
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  K8s Ingress │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
   │ Web Pod │       │ API Pod │       │ AI Pod  │
   │ x2      │       │ x3      │       │ x2      │
   └─────────┘       └─────────┘       └─────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
   │  PgSQL  │       │  Redis  │       │OpenSearch│
   │ Primary │       │ Cluster │       │ Cluster │
   │ + Replica│      │         │       │         │
   └─────────┘       └─────────┘       └─────────┘
```

## 7.3 CI/CD

```
Git Push ──▶ GitHub Actions ──▶ Build ──▶ Test ──▶ Deploy
                │                              │
                ▼                              ▼
           Lint/TypeCheck                Staging → Prod
           Unit Test                    (Blue/Green)
           E2E Test
           Docker Build
```

---

# 八、安全设计

| 层面 | 措施 |
| ---- | ---- |
| 网络 | HTTPS / WAF / DDoS 防护 |
| 认证 | JWT + Refresh Token / OAuth2（GitHub / 微信） |
| 授权 | RBAC（admin / editor / viewer） |
| API | Rate Limit / CORS / Input Validation |
| 数据 | 参数化查询防注入 / 敏感字段加密 |
| 审计 | 操作日志 / 数据变更历史 |

---

# 九、可观测性

| 维度 | 工具 | 说明 |
| ---- | ---- | ---- |
| Metrics | Prometheus + Grafana | QPS / 延迟 / 错误率 |
| Logging | Pino + Loki | 结构化日志 |
| Tracing | OpenTelemetry + Jaeger | 分布式链路 |
| Alerting | AlertManager | 异常告警（飞书/钉钉） |
| APM | Sentry | 前端错误追踪 |

---

# 十、技术决策记录（ADR）

| 决策 | 选择 | 理由 |
| ---- | ---- | ---- |
| 地图引擎 | MapLibre GL（非 Mapbox） | 开源免费、无 API Key 限制 |
| 后端语言 | NestJS（Node.js） | 前端团队可全栈、生态成熟 |
| 备选后端 | FastAPI（Python） | AI 团队友好 |
| 搜索 | OpenSearch（非 ES） | 开源、无 SSPL 限制 |
| 瓦片生成 | Martin（Rust） | 高性能、低资源 |
| ORM | Prisma | 类型安全、迁移友好 |
| 部署 | K8s + Docker | 弹性伸缩 |

---

# 十一、里程碑与资源

| 阶段 | 时间 | 人力 | 关键交付 |
| ---- | ---- | ---- | -------- |
| M1 | 2 周 | 2 人 | 数据库 + 基础地图 + 数据导入脚本 |
| M2 | 4 周 | 3 人 | 完整浏览功能 + 搜索 |
| M3 | 6 周 | 3 人 | 热力图 + 时间轴 + 轨迹 |
| M4 | 8 周 | 4 人 | AI 解读 + 知识图谱 |
| M5 | 12 周 | 5 人 | API 开放 + MCP + Beta 上线 |
