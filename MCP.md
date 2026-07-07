# MCP Server 设计（MCP.md）

> Poetry Atlas of China — 供 AI Agent 使用的知识服务

---

# 一、概述

Poetry Atlas 计划开放一套 **Model Context Protocol (MCP) Server**，让 Claude、Cursor、ChatGPT、Codex 等 AI 客户端能直接查询和调用诗词时空知识库的能力。

> 目标：让 AI Agent 能够"读万卷诗、行万里路"。

---

# 二、MCP 架构

```
┌──────────────────┐     ┌──────────────────────────────────────┐
│   AI Client      │     │        Poetry Atlas MCP Server        │
│                  │     │                                      │
│  Claude Code     │◀───▶│  ┌──────────┐  ┌──────────────────┐ │
│  Cursor          │ MCP │  │  Tool    │  │   Knowledge      │ │
│  ChatGPT         │     │  │  Registry│  │   Sources        │ │
│  Custom Agent    │     │  └────┬─────┘  │                  │ │
│                  │     │       │        │  - Poem Store    │ │
└──────────────────┘     │       │        │  - Author Store   │ │
                         │       │        │  - Place Store    │ │
                         │  ┌────┴─────┐  │  - Graph Store    │ │
                         │  │  Tool    │  │  - Search Engine  │ │
                         │  │  Executor│  └──────────────────┘ │
                         │  └──────────┘                       │
                         └──────────────────────────────────────┘
```

---

# 三、Tool 列表

## 3.1 诗词查询类

### `search_poem`

按多维度搜索诗词。

```jsonc
{
  "name": "search_poem",
  "description": "搜索诗词：支持标题、作者、名句、朝代等多条件组合",
  "inputSchema": {
    "type": "object",
    "properties": {
      "keyword":     { "type": "string",  "description": "关键词（标题/名句）" },
      "author":      { "type": "string",  "description": "作者名" },
      "dynasty":     { "type": "string",  "description": "朝代（唐/宋/...）" },
      "genre":       { "type": "string",  "description": "体裁（诗/词/曲）" },
      "tag":         { "type": "string",  "description": "意象/主题标签" },
      "limit":       { "type": "number",  "default": 10 },
      "offset":      { "type": "number",  "default": 0 }
    }
  }
}
```

### `get_poem_detail`

获取诗词详情（含注释、译文、赏析、地图位置）。

```jsonc
{
  "name": "get_poem_detail",
  "inputSchema": {
    "type": "object",
    "properties": {
      "poem_id":  { "type": "string" },
      "include":  { "type": "array", "items": { "type": "string" },
                    "description": "annotation/translation/appreciation/map" }
    },
    "required": ["poem_id"]
  }
}
```

### `get_random_poem`

随机获取一首诗词（可用于每日一词）。

```jsonc
{
  "name": "get_random_poem",
  "inputSchema": {
    "type": "object",
    "properties": {
      "dynasty": { "type": "string" },
      "genre":   { "type": "string" }
    }
  }
}
```

## 3.2 地点查询类

### `get_place_poems`

获取某地点关联的全部诗词。

```jsonc
{
  "name": "get_place_poems",
  "inputSchema": {
    "type": "object",
    "properties": {
      "place_name":     { "type": "string", "description": "地点名（支持古/今地名）" },
      "relation_type":  { "type": "string", "enum": ["all","creation","description","farewell","passing"] },
      "limit":          { "type": "number", "default": 20 }
    },
    "required": ["place_name"]
  }
}
```

### `get_place_detail`

获取地点详情（坐标、古今映射、统计）。

```jsonc
{
  "name": "get_place_detail",
  "inputSchema": {
    "type": "object",
    "properties": {
      "place_name": { "type": "string" }
    },
    "required": ["place_name"]
  }
}
```

### `search_nearby`

查找某坐标附近的诗词相关地点。

```jsonc
{
  "name": "search_nearby",
  "inputSchema": {
    "type": "object",
    "properties": {
      "longitude": { "type": "number" },
      "latitude":  { "type": "number" },
      "radius_km": { "type": "number", "default": 10 },
      "limit":     { "type": "number", "default": 20 }
    },
    "required": ["longitude", "latitude"]
  }
}
```

## 3.3 作者查询类

### `get_author_detail`

获取作者详情（含旅行轨迹）。

```jsonc
{
  "name": "get_author_detail",
  "inputSchema": {
    "type": "object",
    "properties": {
      "author_name": { "type": "string" }
    },
    "required": ["author_name"]
  }
}
```

### `get_author_route`

获取作者的旅行路线 GeoJSON。

```jsonc
{
  "name": "get_author_route",
  "inputSchema": {
    "type": "object",
    "properties": {
      "author_name":  { "type": "string" },
      "dynasty":      { "type": "string" }
    }
  }
}
```

## 3.4 意象与图谱类

### `get_imagery_network`

查询意象网络（如"月亮"相关的所有诗词）。

```jsonc
{
  "name": "get_imagery_network",
  "inputSchema": {
    "type": "object",
    "properties": {
      "imagery":      { "type": "string", "description": "意象词（月亮/柳树/酒…）" },
      "dynasty":      { "type": "string" },
      "limit":        { "type": "number", "default": 20 }
    },
    "required": ["imagery"]
  }
}
```

### `query_knowledge_graph`

知识图谱关系查询。

```jsonc
{
  "name": "query_knowledge_graph",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entity_name":    { "type": "string" },
      "entity_type":    { "type": "string", "enum": ["author","place","poem","event"] },
      "relation_depth": { "type": "number", "default": 2, "maximum": 5 },
      "limit":          { "type": "number", "default": 30 }
    },
    "required": ["entity_name"]
  }
}
```

## 3.5 工具类（Resource / Prompt）

### Resource: `poem://{id}`

按 URI 直接获取诗词（Resources 标准）。

### Prompt: `analyze_poem`

生成诗词分析的提示模板。

```jsonc
{
  "name": "analyze_poem",
  "inputSchema": {
    "type": "object",
    "properties": {
      "poem_id":    { "type": "string" },
      "focus":      { "type": "string", "enum": ["imagery","emotion","background","technique","all"] }
    }
  }
}
```

### Prompt: `plan_poetry_trip`

生成诗词旅行路线。

```jsonc
{
  "name": "plan_poetry_trip",
  "inputSchema": {
    "type": "object",
    "properties": {
      "theme":      { "type": "string", "description": "路线主题（李白长江/苏轼贬谪/唐代边塞…）" },
      "days":       { "type": "number", "description": "行程天数" },
      "start_city": { "type": "string" }
    }
  }
}
```

---

# 四、传输模式

> **约束**：遵循 `ARCHITECTURE.md` 的 **Zero-Ops First** 原则。
> 
> **不提供 HTTP + SSE / Streamable HTTP 远程部署**。Vercel Serverless 不支持长连接 SSE，且自托管服务器违反零运维约束。
> 
> **stdio 模式**是推荐的唯一传输方式：Claude Code / Cursor 在本地通过 npx 启动，直接连接 Supabase。

| 模式 | 场景 | 配置 |
| ---- | ---- | ---- |
| **stdio** | Claude Code / Cursor 本地调用 | 唯一支持模式 |

> **远程访问替代方案**：通过 Supabase PostgREST API 直接查询（无需 MCP Server），无需额外部署。

---

# 五、快速接入示例

## 5.1 Claude Code 配置

```jsonc
// .mcp.json
{
  "mcpServers": {
    "poetry-atlas": {
      "command": "npx",
      "args": ["-y", "@poetryatlas/mcp-server@latest"]
    }
  }
}
```

## 5.2 Cursor 配置

```jsonc
// .cursor/mcp.json
{
  "mcpServers": {
    "poetry-atlas": {
      "command": "npx",
      "args": ["-y", "@poetryatlas/mcp-server@latest"]
    }
  }
}
```

## 5.3 调用示例（Claude Code 中）

```
用户: 帮我找一首李白在黄鹤楼写的诗

Claude: [调用 search_poem(author="李白", keyword="黄鹤楼")]

工具返回:
- 《黄鹤楼送孟浩然之广陵》
- 故人西辞黄鹤楼，烟花三月下扬州...

Claude: [调用 get_poem_detail(poem_id="xxx", include=["annotation","map"])]
...
```

---

# 六、Server 实现（TypeScript）

> **约束**：遵循 `ARCHITECTURE.md` 的 **Zero-Ops First** 原则。
> 
> - **无 Dockerfile**（不容器化）
> - **无 HTTP Server**（stdio 模式，无需端口监听）
> - **数据直接走 Supabase PostgREST**（通过 supabase-js，无中间 API 层）
> - **认证通过 Supabase Anon Key + 用户 JWT**（无自定义 OAuth）

## 6.1 项目结构

```
packages/mcp-server/          # monorepo 子包
├── src/
│   ├── index.ts              # 入口（stdio transport）
│   ├── tools/                # Tool 定义（直接查 Supabase）
│   │   ├── poem.ts
│   │   ├── place.ts
│   │   ├── author.ts
│   │   ├── search.ts
│   │   └── graph.ts
│   ├── client.ts             # Supabase Client 封装
│   └── types.ts
├── package.json              # 发布到 npm 作为 @poetryatlas/mcp-server
└── README.md
```

> **注意**：`mcp-server` 是 monorepo 内子包，部署时：
> - `next build` → Vercel 托管前端（免费）
> - `@poetryatlas/mcp-server` → npm 包，本地 npx 启动（零服务器）

## 6.2 核心代码

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerPoemTools } from './tools/poem.js';
import { registerPlaceTools } from './tools/place.js';
import { registerAuthorTools } from './tools/author.js';

// 直接连接 Supabase（无需自建 API）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY    // 从环境变量读取
);

const server = new Server(
  { name: 'poetry-atlas', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// Tool 实现中直接使用 supabase-js 查询
registerPoemTools(server, supabase);
registerPlaceTools(server, supabase);
registerAuthorTools(server, supabase);

async function main() {
  const transport = new StdioServerTransport();   // 仅支持 stdio
  await server.connect(transport);
}

main().catch(console.error);
```

## 6.3 发布

```jsonc
// package.json
{
  "name": "@poetryatlas/mcp-server",
  "version": "0.1.0",
  "bin": { "poetryatlas-mcp": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build"
  }
}
```

发布到 NPM：`npm publish --access public`。

---

# 七、安全与治理

> **认证复用 Supabase Auth**（无需自建 API Key / OAuth / Rate Limiter）。

| 维度 | 措施 | 来源 |
| ---- | ---- | ---- |
| 认证 | Supabase JWT（用户级权限） | Supabase Auth 内置 |
| 授权 | RLS（行级安全策略） | Supabase 内置 |
| 可见性 | 仅公开数据可通过 MCP 访问 | RLS 策略控制 |
| 审计 | Supabase Audit Log | 内置（免费层可用） |
| 限速 | 环境变量 `SUPABASE_SERVICE_KEY` 仅本机持有 | 本地机密 |
| 版本化 | Minor 版本保持向后兼容 | npm 语义化版本 |

---

# 八、生态集成

| 工具 | 接入方式 |
| | ---- |
| Claude Code | `.mcp.json`（stdio 模式） |
| Cursor | `.cursor/mcp.json`（stdio 模式） |
| ChatGPT (GPTs) | 通过 Supabase PostgREST API（无需 MCP） |
| LangChain / LangGraph | 直接调用 Supabase + OpenRouter |
| PydanticAI | 直接调用 Supabase + OpenRouter |
| OpenAI Agents SDK | 直接调用 Supabase + OpenRouter |
| n8n | 通过 Supabase HTTP 节点 |

---

# 九、未来演进

1. **语义检索 Tool**：基于 embedding 的查询（"找一首关于孤独的诗"）
2. **生成 Tool**：根据主题生成赏析/短视频脚本
3. **订阅 Resource**：实时推送每日诗词
4. **协作 Prompt**：教师备课/旅行规划模板

---

# 十、开源计划

- MCP Server 开源（MIT 协议），npm 发布 `@poetryatlas/mcp-server`
- 鼓励社区贡献：新数据源适配器、新 Tool 实现、多语言 Prompt
- 开发者通过 `npx @poetryatlas/mcp-server` 一键启动（零服务器）
- 公共 Supabase 沙箱实例供体验（通过环境变量 `NEXT_PUBLIC_SUPABASE_URL` 配置）
