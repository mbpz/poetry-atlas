# 系统架构设计（ARCHITECTURE.md）

> Poetry Atlas of China — 整体技术架构

---

# 设计原则（Design Principles）

## Zero-Ops First（零运维优先）

项目优先采用 Serverless 与托管服务，保证**个人开发者**可以在几乎**零运维成本**下长期运行。

### 硬性约束

- ✅ 默认部署到 **Vercel Hobby（免费）**
- ✅ 无需自建服务器（No VPS）
- ✅ 无需 Docker 才能运行
- ✅ 无需 Kubernetes
- ✅ 优先使用免费额度
- ✅ **GitHub Push 自动部署**
- ✅ 支持 **一键 Fork + 一键部署**
- ✅ 仅通过环境变量即可完成全部配置
- ✅ 单仓库 monorepo，无微服务拆分

### 评估原则

> **任何新增技术栈，都应优先评估其是否符合上述约束。**

如果引入一项技术需要：

- 购买服务器 → ❌ 否决
- 安装守护进程 → ❌ 否决
- 手动运维 → ❌ 否决

---

## AI Native First

项目应天然适配 **Claude Code / Cursor / Codex** 等 AI 编程工具：

- 所有工程决策写入文档（本项目 `/*.md` 即项目上下文）
- 代码变更必须可追溯到文档
- 禁止"只有代码能解释"的魔法逻辑
- AI 可独立完成：阅读文档 → 理解架构 → 实现功能

---

# 一、架构总览

```
                     GitHub
                        │
               Git Push 自动部署
                        │
                   Vercel Free Hobby
                        │
             ┌──────────┴──────────┐
             │                     │
        SSR / SSG              API Routes
        React Pages            Server Actions
             │                     │
             └──────────┬──────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
     Supabase      Cloudflare      AI Gateway
     PostgreSQL    R2              (OpenRouter)
     PostGIS       图片/JSON       Claude/GPT/DeepSq
          │
          │
     ┌───┴───┐
     │Realtime│
     └───────┘
```

> **整个系统没有自己的服务器。**

---

# 二、为什么不选择传统后端？

## 2.1 为什么不推荐 NestJS / Express / FastAPI 自建服务？

| 对比 | 自建 Node/Python 服务 | Next.js Server Actions |
| ---- | --------------------- | ---------------------- |
| 运行方式 | 常驻进程 | Serverless 函数 |
| 部署 | Docker → Vercel 仅 SSR | 原生支持 |
| 运维 | 需要 | 不需要 |
| 冷启动 | 常驻 0ms | < 200ms（可接受） |
| 并发 | 单进程受限 | 自动伸缩 |
| 成本 | 需 VPS | **免费** |

Vercel **没有常驻 Node 进程**，NestJS 的优势几乎发挥不了。

## 2.2 推荐方案：全部使用 Next.js Ecosystem

```
Next.js App Router
  ├── SSR/SSG/ISR 页面
  ├── Route Handlers      （轻量 API，如 /api/search）
  ├── Server Actions      （数据库 Mutation，替代大部分后端）
  └── Middleware          （鉴权、Rate Limit）
```

### Next.js 能做的事

| 任务 | 解决方案 |
| ---- | -------- |
| 读取数据库 | `supabase-js` Client（RSC 直接调用） |
| 写入数据库 | Server Actions（带权限校验） |
| 后台任务 | Vercel Cron（最多 2 个/天，免费） |
| 文件上传 | Supabase Storage / R2 |
| AI 调用 | Route Handler 代理 AI Gateway |
| 全文搜索 | Supabase `tsvector` 或 Algolia Free Tier |
| 定时爬取 | GitHub Actions（不是线上） |

---

# 三、技术栈详解

## 3.1 前端

| 模块 | 选型 | 说明 |
| ---- | ---- | ---- |
| 框架 | **Next.js 15 (App Router)** | SSR/SSG/ISR 统一 |
| 语言 | **TypeScript 5（严格模式）** | 类型即文档 |
| UI | **shadcn/ui + Radix** | 无头组件，可定制 |
| 样式 | **TailwindCSS 4** | 原子化 CSS |
| 状态 | **Zustand + React Query** | 轻量 + 服务端状态 |
| 地图引擎 | **MapLibre GL JS** | 开源免费，无 Key 限制 |
| 数据可视化 | **Deck.gl** | 热力图、轨迹、3D |
| 动画 | **Framer Motion** | 微交互 |
| 国际化 | **next-intl** | 中/英双语 |

### 为什么不选 Mapbox GL？

| 对比 | Mapbox GL | MapLibre GL |
| ---- | --------- | ----------- |
| 费用 | 超过 50k/月 收费 | **永久免费** |
| 底图 | Mapbox Studio | OpenStreetMap 等 |
| 开源 | 部分开源 | **完全开源** |
| 锁定 | API Key 依赖 | 无依赖 |

> **MapLibre GL 是 Mapbox GL 的开源 fork，API 几乎一致**，但无任何收费点。

## 3.2 数据库

选型：**Supabase**（开源 Firebase 替代品）

| 能力 | 免费额度 | 是否够用 |
| ---- | -------- | -------- |
| PostgreSQL | 500MB | ✅ 几十万首诗词 |
| PostGIS | 内置 | ✅ 空间查询 |
| 认证（Auth） | 50k 用户/月 | ✅ 足够 |
| Storage | 1GB | 图片 + JSON |
| Realtime | 200 并发 | ✅ |
| 边缘函数 | 500k/月 | ✅ |

### 为什么选 Supabase？

- 自建 PostGIS 需要服务器
- 免费额度足够 MVP 到 10 万用户
- 内置 **Auth**、**Realtime**、**Storage**
- 完整的 SQL 能力（触发器、RLS、全文搜索）
- 国内有镜像（supabase.cn），也可自建

## 3.3 ORM

选型：**Drizzle ORM**

| 对比 | Prisma | Drizzle |
| ---- | ------ | ------- |
| 运行时 | 有生成步骤 | **接近零运行时** |
| 启动速度 | 较慢 | **快（Serverless 友好）** |
| 类型安全 | ✅ | ✅ |
| Bundle Size | 较大 | **极小** |
| RSC 兼容 | 需额外处理 | **原生支持** |
| 迁移 | CLI | CLI（更轻量） |

## 3.4 搜索

**第一阶段：PostgreSQL 全文搜索**

```sql
-- Supabase 启用全文搜索
ALTER TABLE "Poem" ADD COLUMN tsv tsvector;
CREATE INDEX poem_tsv_idx ON "Poam" USING GIN(tsv);

-- 更新触发器
CREATE FUNCTION poem_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.tsv = to_tsvector('chinese', NEW.title || ' ' || NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
```

> **几十万首诗词根本不需要 Elasticsearch**。

**第二阶段（可选）**：如果搜索需求升级，可接入 **Algolia Free Tier**（10k 文档）或 **Meilisearch**（自建部署在 Railway Free）。

## 3.5 对象存储

选型：**Cloudflare R2**

| 对比 | AWS S3 | Cloudflare R2 |
| ---- | ------ | ------------- |
| 出口费 | $0.09/GB | **免费** |
| 请求费 | 有 | 免费额度足够 |
| CDN | 需 Cloudflare 配合 | 自带 |
| 国内访问 | 需备案 | 可用 |

存储内容：

- 作者头像、景点图片
- 预生成 JSON 数据（`/public/data/` 也可）
- 用户生成内容（AI 配图等）

## 3.6 地图瓦片

- **底图**：OpenStreetMap（免费）
- **瓦片风格**：MapTiler Free Tier（100k/月）或自部署 Martin
- **GeoJSON**：预生成静态文件，Vercel CDN 分发

## 3.7 AI 服务

**不要自己部署模型**。统一通过 **AI Gateway**：

| Gateway | 说明 |
| --- | --- |
| **OpenRouter** | 多模型统一入口，按调用付费 |
| **Vercel AI SDK** | 统一 API，支持流式、Tool Use |
| **AI Gateway（Vercel KV 缓存）** | 自动去重 + 缓存 |

### 多模型路由

```typescript
// lib/ai/router.ts
const MODEL_MAP = {
  // 国内用户 → 国内模型
  china: {
    poem_analysis: 'deepseek-chat',
    place_narration: 'qwen-plus',
    dialogue: 'deepseek-chat',
    fallback: 'qwen-turbo',
  },
  // 海外用户 → 海外模型
  overseas: {
    poem_analysis: 'claude-sonnet-4-5',
    place_narration: 'claude-sonnet-4-5',
    dialogue: 'claude-haiku-4-5-20251001',
    fallback: 'gpt-4o-mini',
  }
};
```

---

# 四、Next.js 项目结构

```
poetry-atlas/
├── app/                          # App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页（全屏地图）│
│   ├── sitemap.ts                # SEO
│   ├── robots.ts
│   ├── (main)/
│   │   ├── map/
│   │   │   └── page.tsx
│   │   ├── place/[id]/
│   │   │   └── page.tsx          # 地点详情（SSR）
│   │   ├── poem/[id]/
│   │   │   └── page.tsx          # 诗词详情（SSR）
│   │   ├── author/[id]/
│   │   │   └── page.tsx
│   │   └── search/
│   │       └── page.tsx
│   ├── api/                      # Route Handlers
│   │   ├── search/
│   │   │   └── route.ts          # 搜索 API
│   │   ├── ai/
│   │   │   ├── chat/route.ts     # AI 对话
│   │   │   ├── analyze/route.ts  # 诗词解析
│   │   │   └── plan/route.ts     # 旅行规划
│   │   ├── places/
│   │   │   ├── route.ts          # 地点列表
│   │   │   └── [id]/route.ts
│   │   ├── heatmap/
│   │   │   └── route.ts          # 热力图数据
│   │   └── timeline/
│   │       └── route.ts          # 时间轴
│   └── actions/                  # Server Actions
│       ├── poem.ts
│       ├── favorite.ts
│       └── feedback.ts
├── components/
│   ├── map/
│   │   ├── ChinaMap.tsx
│   │   ├── BubbleLayer.tsx
│   │   ├── HeatmapLayer.tsx
│   │   ├── TrajectoryLayer.tsx
│   │   └── PoetryCloudLayer.tsx
│   ├── ui/                       # shadcn 组件
│   ├── poem/
│   ├── place/
│   ├── author/
│   ├── search/
│   ├── timeline/
│   └── ai/                       # AI 交互组件
│       ├── ChatBubble.tsx
│       ├── PoetryChat.tsx
│       └── MapGenerator.tsx
├── lib/
│   ├── supabase/                 # Supabase Client
│   │   ├── client.ts             # 浏览器端
│   │   ├── server.ts             # RSC 端
│   │   └── admin.ts              # 服务端 Service Role
│   ├── ai/                       # AI 封装
│   │   ├── router.ts             # 模型路由
│   │   ├── prompts.ts            # Prompt 模板
│   │   └── cache.ts              # 结果缓存
│   ├── map/                      # 地图工具
│   │   ├── coordinate.ts         # GCJ02 ↔ WGS84
│   │   ├── tiles.ts
│   │   └── styles.ts
│   ├── db/                       # Drizzle
│   │   ├── index.ts              # DB 实例
│   │   ├── schema.ts             # Schema 定义
│   │   └── repositories/         # 数据仓库
│   ├── hooks/
│   └── utils/
├── db/
│   └── migrations/               # Drizzle 迁移文件
├── public/
│   ├── data/                     # 静态化数据
│   │   ├── places-index.json     # 全国地点索引
│   │   ├── dynasty-stats.json
│   │   ├── province/
│   │   │   └── zhejiang.json
│   │   └── tiles/                # 离线瓦片（可选）
│   ├── fonts/
│   └── images/
├── supabase/
│   ├── migrations/               # Supabase SQL 迁移
│   ├── functions/                # Edge Functions
│   └── seed/                     # 初始数据
├── scripts/                      # 数据脚本
│   ├── crawl/                    # 爬虫
│   ├── transform/                # 数据转换
│   ├── generate-static/          # 生成静态 JSON
│   └── quality/                  # 质检
├── .github/
│   └── workflows/                # CI / 定时任务
│       ├── ci.yml
│       ├── crawl.yml              # 定时爬取
│       └── generate-data.yml     # 重新生成 JSON
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.ts
├── .env.local                    # 本地环境变量
├── .env.example                  # 模板（可公开）
└── package.json
```

---

# 五、数据策略（静态优先）

## 5.1 核心原则

> **Build 时生成，Build 后不变。**

尽量把数据**预计算**为静态 JSON，放 `public/data/`，Vercel CDN 分发。

## 5.2 什么数据应该静态？

| 数据 | 存储位置 | 更新方式 |
| ---- | -------- | -------- |
| 全国地点索引 | `public/data/places-index.json` | Build 脚本 |
| 全国作者索引 | `public/data/authors-index.json` | Build 脚本 |
| 朝代统计 | `public/data/dynasty-stats.json` | Build 脚本 |
| 分类数据 | `public/data/categories.json` | Build 脚本 |
| 单地点详情 | `public/data/place/{id}.json` | GitHub Actions |
| 单诗词全文 | **数据库**（太大，不静态） | — |
| 搜索结果 | **数据库**（动态） | — |
| AI 结果 | **数据库 + KV 缓存** | 首次生成后缓存 |

## 5.3 数据更新策略

不要在线上爬。使用**离线构建 + 自动部署**：

```
┌──────────────┐
│ GitHub       │
│ Scheduled    │  每天 22:00
│ Action       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Crawler      │  爬取增量数据
│ (Python/Node)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Transformer  │  清洗 + 关联抽取
│ (LLM + 规则) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generator    │  生成 JSON + 更新 DB
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ git commit   │
│ && push      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Vercel       │  自动部署
│ Deploy       │
└──────────────┘
```

### GitHub Actions 配置

```yaml
# .github/workflows/daily-update.yml
name: Daily Data Update

on:
  schedule:
    - cron: '0 22 * * *'   # 每天 22:00 UTC
  workflow_dispatch:          # 支持手动触发

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Crawl Incremental Data
        run: python scripts/crawl/incremental.py
      
      - name: Transform & Generate JSON
        run: |
          python scripts/transform/clean.py
          python scripts/generate-static/build.py
      
      - name: Update Supabase (if needed)
        run: python scripts/db/sync.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      
      - name: Git Commit & Push
        run: |
          git config user.name "bot"
          git config user.email "bot@poetryatlas.cn"
          git add public/data/ db/
          git diff --quiet && git diff --staged --quiet || \
            git commit -m "chore: daily data update $(date +%Y-%m-%d)"
          git push
```

## 5.4 AI 内容缓存策略

**禁止实时生成 AI 内容**！第一次生成后永久缓存。

```typescript
// lib/ai/cache.ts
import { kv } from '@vercel/kv';

const TTL_FOREVER = 60 * 60 * 24 * 365 * 10; // 10 年 ≈ 永不失效

async function getCachedOrGenerate(
  key: string,
  generator: () => Promise<string>
): Promise<string> {
  // 1. 尝试缓存
  const cached = await kv.get<string>(key);
  if (cached) return cached;

  // 2. 生成
  const result = await generator();

  // 3. 写入缓存（KV 免费额度内）
  await kv.set(key, result, { ex: TTL_FOREVER });

  return result;
}

// 示例：杭州 AI 介绍
export async function getHangzhouIntro(): Promise<string> {
  return getCachedOrGenerate('ai:intro:place:hangzhou', async () => {
    const response = await generateAIIntroduction('杭州', hangzhouPoems);
    return response;
  });
}
```

**缓存层级**：

1. **Vercel KV**（Edge Cache，免费额度 10k/月）
2. **Supabase 表**（`ai_cache` 表，无额度限制）
3. **Vercel ISR**（页面级缓存，自动）
4. **Cloudflare CDN**（命中即返回）

---

# 六、API 设计

## 6.1 Route Handlers（轻量 API）

```typescript
// app/api/places/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PlaceRepository } from '@/lib/db/repositories/place';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox');        // 视口范围
  const dynasty = searchParams.get('dynasty');    // 朝代筛选
  const limit = parseInt(searchParams.get('limit') || '100');

  const places = await PlaceRepository.findByBbox(bbox, dynasty, limit);
  
  return NextResponse.json({
    type: 'FeatureCollection',
    features: places
  });
}
```

## 6.2 Server Actions（Mutation）

```typescript
// app/actions/favorite.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';

export async function addFavorite(poemId: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');

  await supabase
    .from('favorites')
    .insert({ user_id: user.id, poem_id: poemId });

  revalidatePath('/poem/' + poemId);
}
```

## 6.3 静态 API（Public JSON）

```typescript
// 直接使用 /data/xxx.json，无需 Route Handler
fetch('/data/places-index.json').then(r => r.json())
```

---

# 七、地图数据策略

## 7.1 静态 GeoJSON

| 数据 | 文件 | 大小 |
| --- | --- | --- |
| 全国地点气泡 | `public/data/geo/china-places.json` | ~200KB |
| 省级边界 | `public/data/geo/provinces.json` | ~500KB |
| 城市边界 | `public/data/geo/cities.json` | ~2MB |
| 历史地图 | `public/data/geo/ancient/ Tang.json` | 逐朝代 |

## 7.2 动态地图（按视口查询）

```typescript
// 地图移动时动态加载
const fetchVisiblePlaces = async (map: maplibregl.Map) => {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  const response = await fetch(
    `/api/places?bbox=${bounds.toArray()}&zoom=${zoom}&dynasty=${currentDynasty}`
  );
  
  return response.json();
};
```

---

# 八、AI 架构（详细）

## 8.1 场景与模型映射

| 场景 | 国内模型 | 海外模型 | 缓存 |
| ---- | --- | --- | --- |
| 诗词解析 | `deepseek-chat` | `claude-sonnet-4` | ✅ KV |
| 地点故事 | `qwen-plus` | `claude-sonnet-4` | ✅ KV |
| 旅行规划 | `deepseek-chat` | `claude-sonnet-4` | ✅ DB |
| AI 对话 | `qwen-turbo` | `claude-haiku` | ❌ 流式 |
| 名句生成 | `deepseek-chat` | `gpt-4o` | ✅ KV |
| 数据抽取 | `deepseek-chat` | `claude-sonnet-4` | ✅ DB |

## 8.2 通过 Vercel AI SDK 调用

```typescript
// lib/ai/client.ts
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!
});

export async function generatePoemAnalysis(poem: string) {
  const { text } = await generateText({
    model: openrouter('deepseek/deepseek-chat'),
    system: POEM_ANALYSIS_SYSTEM_PROMPT,
    prompt: poem,
  });
  
  return text;
}
```

## 8.3 Prompt 管理

```typescript
// lib/ai/prompts.ts
export const POEM_ANALYSIS_SYSTEM_PROMPT = `
你是精通中国古代文学的学者。请对诗词进行全方位解读。

要求：
1. 白话翻译（信达雅）
2. 典故识别（出处与含义）
3. 情感分析（主/次情感 + 正负面倾向）
4. 意象识别（自然/人文意象分类）
5. 创作背景（基于史料推测）
6. 艺术手法（修辞/结构/音律）

输出 JSON，遵循 schema：
{schema}
`;
```

Prompt 变更后需跑回归测试：

```bash
pnpm ai:test  # 跑 prompt 测试套件
```

---

# 九、部署与运维

## 9.1 Vercel Hobby 免费额度

| 资源 | 限制 | 是否够用 |
| --- | --- | --- |
| 带宽 | 100GB/月 | ⭐⭐⭐⭐⭐ |
| Serverless 调用 | 100GB-小时/月 | ⭐⭐⭐⭐⭐ |
| 图像优化 | 1000 张/月 | ⭐⭐⭐⭐ |
| 构建时间 | 400 分钟/月 | ⭐⭐⭐⭐⭐ |
| 并发构建 | 1 | 足够 |
| 自定义域名 | 无限 | ✅ |
| 环境变量 | 无限 | ✅ |
| Cron Jobs | 2 个（每天 2 次） | ⭐⭐⭐ |
| 部署预览 | 每个 PR 自动 | ✅ |

## 9.2 环境变量模板

```bash
# .env.local（开发）；Vercel Dashboard（生产）

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── AI ──
OPENROUTER_API_KEY=sk-or-...

# ── Vercel KV ──
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# ── 可选：分析/监控 ──
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=poetryatlas.cn    # 免费分析
SENTRY_DSN=...                                 # 免费错误追踪

# ── 爬取（仅 GitHub Actions 用）──
CRAWL_USER_AGENT=PoetryAtlas/1.0
```

## 9.3 部署命令

```bash
# 本地开发
pnpm dev                  # http://localhost:3000

# 连接 Supabase
npx supabase login
npx supabase link --project-ref xxx

# 本地测试生产构建
pnpm build && pnpm start

# 数据库迁移
pnpm db:generate         # 生成迁移
pnpm db:migrate          # 应用到 Supabase
pnpm db:seed             # 导入初始数据

# 数据更新
pnpm data:crawl          # 爬取
pnpm data:transform      # 清洗
pnpm data:generate       # 生成静态 JSON
pnpm data:validate       # 质量检查
```

---

# 十、成本估算

## 10.1 MVP 阶段（0–10k 用户）

| 服务 | 月费 | 说明 |
| --- | --- | --- |
| Vercel Hobby | **$0** | 绑定自定义域名 ¥50/年 |
| Supabase Free | **$0** | 500MB |
| Cloudflare R2 | **$0** | 免费额度 |
| GitHub | **$0** | 公开仓库 |
| OpenRouter | **$5–20** | 按 AI 调用量 |
| 域名（.cn） | **¥5/月** | |
| **合计** | **< ¥100/月** | |

## 10.2 增长阶段（10k–100k 用户）

| 服务 | 月费 | 触发条件 |
| --- | --- | --- |
| Vercel Pro | $20 | 带宽或构建超时 |
| Supabase Pro | $25 | 数据库超过 500MB |
| OpenRouter | $50–200 | AI 调用量增长 |
| **合计** | **< $300/月** | |

> **关键**：前端几乎不用改。

---

# 十一、平滑升级路线

```
MVP（免费）
  │
  ▼
Next.js + Supabase + Vercel
  │
  ├── 带宽不够？ ──▶ Vercel Pro（$20）
  │
  ├── 数据库不够？ ──▶ Supabase Pro（$25）
  │
  ├── AI 费用太高？ ──▶ 接入国产模型
  │
  ├── 搜索不够快？ ──▶ 接入 Algolia Free
  │
  ├── 并发太高？ ──▶ Cloudflare Workers 代理层
  │
  ├── 需要强一致性？ ──▶ 自建 API（Railway / Fly.io）
  │
  └── 真的需要 K8s？ ──▶ 已经是成功项目了 🎉
```

> **每一层升级都只换一个组件，前端代码无需大改。**

---

# 十二、安全与治理

| 层面 | 方案 |
| --- | --- |
| 认证 | Supabase Auth（Magic Link / OAuth） |
| 授权 | RLS（Row Level Security，行级安全） |
| API 限速 | Vercel WAF + 自实现中间件 |
| 数据校验 | Zod（前后端共享 schema） |
| 环境变量 | Vercel 注入 + `.gitignore .env.local` |
| 内容安全 | AI 输出过滤 + 人工审核 |
| 备份 | Supabase 自动每日备份（免费） |
| 监控 | Vercel Analytics + Sentry Free |

## 12.1 Supabase RLS 示例

```sql
-- 用户只能读写自己的收藏
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
ON favorites
USING (auth.uid() = user_id);

-- 公开数据所有人可读
CREATE POLICY "Public poems are viewable by everyone"
ON poem
FOR SELECT
USING (true);
```

---

# 十三、开发规范

## 13.1 AI Native 开发约定

```markdown
# .claude/CLAUDE.md（项目上下文）

## 架构约束
- 必须遵循 ARCHITECTURE.md 中的 Design Principles
- 任何新增 npm 包需评估 Serverless 兼容性
- 数据库变更必须生成 Drizzle 迁移文件

## 数据规则
- 静态数据：public/data/ 目录，Build 时生成
- 动态数据：Supabase 查询（带 RLS）
- AI 结果：必须缓存，禁止实时生成

## 命名规范
- 文件：kebab-case
- 组件：PascalCase
- 数据库表：PascalCase（与 Prisma/Drizzle 一致）
- 环境变量：SCREAMING_SNAKE_CASE
```

## 13.2 Commit 规范

```
feat:     新功能（用户可见）
fix:      修复 Bug
docs:     文档变更
data:     数据更新（爬取/清洗/生成）
ai:        Prompt / AI 相关
map:       地图相关
refactor: 重构（用户不可见）
chore:    工具/依赖
```

## 13.3 PR 检查清单

- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 无错误
- [ ] `pnpm test` 通过
- [ ] 数据库迁移已生成（如有）
- [ ] 静态数据已重新生成（如影响数据）
- [ ] 文档已更新（如有架构变更）
- [ ] 确认符合 Design Principles

---

# 十四、Roadmap 总览

| 阶段 | 时间 | 关键交付 | 服务 |
| --- | --- | --- | --- |
| M1 | 2 周 | 数据库 + 静态地图 + 数据导入 | Supabase Free |
| M2 | 4 周 | 地点详情 + 搜索 + 朝代切换 | + Vercel（已有） |
| M3 | 6 周 | 热力图 + 时间轴 + 轨迹 | + GitHub Actions |
| M4 | 8 周 | AI 解读 + 知识图谱 | + OpenRouter |
| M5 | 12 周 | 上线 Beta | 全栈 |
| M6 | 16 周 | MCP Server + 开放 API | + Cloudflare R2 |

---

# 附录 A：关键技术决策记录（ADR）

## ADR-001：为什么选 MapLibre GL 而不是 Mapbox GL？

**状态**：已接受

**原因**：
- Mapbox GL JS 在请求超过 50k/月后开始收费
- MapLibre GL 是其开源 fork，API 几乎完全兼容
- 无 API Key 限制
- 国内合规

**影响**：零成本使用地图渲染，无需担心额度问题。

---

## ADR-002：为什么用 Drizzle 而不是 Prisma？

**状态**：已接受

**原因**：
- Drizzle 零运行时、启动更快
- 更适合 Serverless 环境
- Bundle Size 更小
- 与 React Server Components 兼容更好

**影响**：冷启动时间更短，Vercel 免费额度内可处理更多请求。

---

## ADR-003：为什么后端用 Server Actions 而不是 NestJS？

**状态**：已接受

**原因**：
- Vercel 没有常驻 Node 进程
- NestJS 需要 Docker + VPS
- Server Actions 部署零配置
- Next.js 统一全栈

**影响**：无需维护独立后端服务，零运维。

---

## ADR-004：为什么数据优先静态化？

**状态**：已接受

**原因**：
- 90% 的查询是重复的（热门地点/作者）
- 静态 JSON 由 Vercel CDN 分发，零服务器成本
- Build 时计算比实时计算更快

**影响**：数据库压力大幅降低，响应速度更快。

---

## ADR-005：为什么用 OpenRouter 而不是直接调用多个 API？

**状态**：已接受

**原因**：
- 统一 API 格式（OpenAI 兼容）
- 一个 Key 访问 100+ 模型
- 自动故障转移
- 成本透明

**影响**：无需在代码中处理多 SDK 适配。