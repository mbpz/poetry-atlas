完全可以，而且**我建议从第一天就围绕 Vercel Free 进行架构设计**。

你的这个项目（地图 + 数据查询 + AI 增强）其实很适合采用 **Jamstack + Serverless + BaaS** 架构，把计算尽量放到浏览器和第三方服务，避免自己维护服务器。

---

# 设计目标

**约束：**

> **整个项目可以长期运行在 Vercel Hobby（免费版）上。**

意味着：

* ✅ 不需要购买 VPS
* ✅ 不需要 Docker
* ✅ 不需要 Kubernetes
* ✅ 不需要运维
* ✅ GitHub Push 自动部署

整个架构尽量 Serverless。

---

# 推荐整体架构

```text
                GitHub
                   │
          Git Push 自动部署
                   │
              Vercel Free
        ┌──────────────────┐
        │                  │
        │  Next.js App     │
        │                  │
        │  React           │
        │  MapLibre        │
        │  Tailwind        │
        │                  │
        └──────┬───────────┘
               │
      Server Actions / API Routes
               │
    ┌──────────┴─────────────┐
    │                        │
 Supabase               Cloudflare R2
 PostgreSQL             图片 / 静态资源
 PostGIS                JSON 数据
    │
    │
 OpenAI / DeepSeek
```

整个系统没有自己的服务器。

---

# 为什么不用 NestJS？

很多人第一反应：

```text
Next.js

↓

NestJS

↓

Postgres
```

实际上：

**不推荐。**

原因：

NestJS 需要：

* Node Server
* 常驻进程
* Docker

而：

Vercel：

没有常驻 Node。

所以：

NestJS 的优势几乎发挥不了。

---

建议：

全部使用：

```text
Next.js

↓

Server Actions

↓

Supabase
```

即可。

---

# 推荐技术栈

## 前端

```
Next.js 15

React

TypeScript

TailwindCSS

shadcn/ui

MapLibre GL
```

为什么不用 Mapbox？

Mapbox：

超过额度收费。

MapLibre：

永久免费。

还能：

OpenStreetMap。

---

## 地图

推荐：

MapLibre GL

底图：

OpenStreetMap

或者：

MapTiler 免费额度。

后期：

可以自己部署 Tiles。

---

## 数据库

推荐：

Supabase。

免费：

500MB

足够：

几十万首诗。

支持：

PostGIS。

SQL。

全文搜索。

认证。

Storage。

Realtime。

几乎不用写后端。

---

## ORM

Drizzle ORM

原因：

和 Serverless 很搭。

启动快。

Type-safe。

---

## 搜索

第一阶段：

Postgres Full Text。

不用：

Elasticsearch。

原因：

几十万数据：

根本不需要 ES。

---

## 图片

Cloudflare R2。

免费。

或者：

GitHub。

---

## CDN

全部：

Vercel CDN。

---

# AI

不要自己部署模型。

统一：

AI Gateway。

例如：

```
OpenRouter

↓

Claude

GPT

DeepSeek

Qwen
```

只要：

换 Key。

不用改代码。

---

# 数据怎么存？

不要：

每次请求：

数据库。

建议：

大量静态化。

例如：

杭州：

```json
{
  "city":"杭州",

  "count":582,

  "authors":[...],

  "poems":[...]
}
```

直接：

Static JSON。

放：

```
/public/data/

hangzhou.json
```

浏览器：

直接加载。

几乎：

零成本。

---

# 哪些数据静态？

推荐：

```
全国地点

↓

JSON

全国作者

↓

JSON

朝代

↓

JSON

分类

↓

JSON
```

全部：

Build。

部署。

---

只有：

用户搜索。

才：

查询数据库。

---

# 地图

地图数据：

GeoJSON。

例如：

```
china.geojson

province.geojson

city.geojson
```

全部：

静态。

Vercel CDN。

---

# AI 内容缓存

AI：

不要：

实时生成。

建议：

第一次：

```
杭州

↓

AI总结

↓

存数据库
```

以后：

直接：

读取。

避免：

重复调用。

---

# API

尽量：

REST。

例如：

```
/api/place/hangzhou

/api/author/libai

/api/search

/api/timeline

/api/heatmap
```

Serverless。

---

# 数据更新

不要：

线上爬。

推荐：

GitHub Actions。

每天：

```
Crawler

↓

生成 JSON

↓

Commit

↓

Push

↓

Vercel 自动部署
```

完全自动。

---

# 成本估算

| 服务                       | 免费额度                        | 是否够用          |
| ------------------------ | --------------------------- | ------------- |
| Vercel Hobby             | 每月 100GB 带宽、Serverless 调用额度 | ⭐⭐⭐⭐⭐         |
| Supabase                 | 500MB 数据库 + Auth + Storage  | ⭐⭐⭐⭐⭐（MVP 足够） |
| Cloudflare R2            | 每月免费请求额度，几乎零出口费             | ⭐⭐⭐⭐⭐         |
| GitHub                   | 无限公开仓库                      | ⭐⭐⭐⭐⭐         |
| MapLibre + OpenStreetMap | 免费                          | ⭐⭐⭐⭐⭐         |
| OpenRouter               | 按调用付费                       | ⭐⭐⭐⭐          |

---

# 未来升级路线

这个架构的另一个优点是**平滑升级**：

```
MVP

↓

Next.js

↓

Supabase

↓

Vercel

↓

10万用户

↓

需要升级？

↓

Supabase Pro

↓

需要升级？

↓

Cloudflare Workers

↓

需要升级？

↓

独立 API

↓

需要升级？

↓

Kubernetes
```

**前端几乎不用改。**

---

# 我建议再增加一个约束

如果你打算长期做这个项目，我会在 `ARCHITECTURE.md` 最前面加入一条设计原则：

```markdown
# Design Principles

## Zero-Ops First（零运维优先）

项目优先采用 Serverless 与托管服务，保证个人开发者可以在几乎零运维成本下长期运行。

### Constraints

- ✅ 默认部署到 Vercel Hobby
- ✅ 无需自建服务器
- ✅ 无需 Docker 才能运行
- ✅ 无需 Kubernetes
- ✅ 优先使用免费额度
- ✅ GitHub Push 自动部署
- ✅ 支持一键 Fork 与一键部署
- ✅ 支持环境变量即可完成配置

任何新增技术栈，都应优先评估其是否符合上述约束。
```

我还建议增加一个**"AI Native + Vercel First"** 的工程规范，让整个项目天然适配 Claude Code、Cursor、Codex 等 AI 编程工具，并确保所有功能都能在免费部署环境中完成开发和验证。
