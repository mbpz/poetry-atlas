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

| 模式 | 场景 | 配置 |
| ---- | ---- | ---- |
| **stdio** | Claude Code / Cursor 本地调用 | 默认 |
| **HTTP + SSE** | 远程部署、多用户共享 | `/sse` 端点 |
| **Streamable HTTP** | 最新 MCP 规范，通用性最好 | `/mcp` 端点 |

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

或远程模式：

```jsonc
{
  "mcpServers": {
    "poetry-atlas": {
      "type": "sse",
      "url": "https://mcp.poetryatlas.cn/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
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
      "type": "sse",
      "url": "https://mcp.poetryatlas.cn/sse"
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

## 6.1 项目结构

```
mcp-server/
├── src/
│   ├── index.ts          # 入口
│   ├── server.ts         # MCP Server 实例
│   ├── tools/            # Tool 定义
│   │   ├── poem.ts
│   │   ├── place.ts
│   │   ├── author.ts
│   │   ├── search.ts
│   │   └── graph.ts
│   ├── resources/        # Resource 定义
│   │   └── poem.ts
│   ├── prompts/          # Prompt 模板
│   │   ├── analyze.ts
│   │   └── trip.ts
│   ├── client.ts         # 后端 API 客户端
│   └── types.ts
├── package.json
└── Dockerfile
```

## 6.2 核心代码

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerPoemTools } from './tools/poem.js';
import { registerPlaceTools } from './tools/place.js';
import { registerAuthorTools } from './tools/author.js';

const server = new Server(
  { name: 'poetry-atlas', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

registerPoemTools(server);
registerPlaceTools(server);
registerAuthorTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

```typescript
// src/tools/poem.ts
export function registerPoemTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_poem',
        description: '搜索诗词',
        inputSchema: { /* ... */ }
      },
      {
        name: 'get_poem_detail',
        description: '获取诗词详情',
        inputSchema: { /* ... */ }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'search_poem':
        return await handleSearchPoem(args);
      case 'get_poem_detail':
        return await handleGetPoemDetail(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
}
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

| 维度 | 措施 |
| ---- | ---- |
| 认证 | API Key + OAuth（未来） |
| 限速 | 单 Key 100 req/min |
| 可见性 | 仅公开数据可通过 MCP 访问 |
| 审计 | 所有 Tool 调用记录 |
| 版本化 | Minor 版本保持向后兼容 |

---

# 八、生态集成

| 工具 | 接入方式 |
| | ---- |
| Claude Code | `.mcp.json` 或全局配置 |
| Cursor | `.cursor/mcp.json` |
| ChatGPT (GPTs) | MCP Bridge 或 Actions |
| LangChain / LangGraph | `MCPClient` |
| PydanticAI | MCP 工具提供商 |
| OpenAI Agents SDK | `MCPServer` |
| n8n | MCP 节点 |

---

# 九、未来演进

1. **语义检索 Tool**：基于 embedding 的查询（"找一首关于孤独的诗"）
2. **生成 Tool**：根据主题生成赏析/短视频脚本
3. **订阅 Resource**：实时推送每日诗词
4. **协作 Prompt**：教师备课/旅行规划模板

---

# 十、开源计划

- MCP Server 开源（MIT 协议）
- 鼓励社区贡献：新数据源适配器、新 Tool 实现、多语言 Prompt
- 提供沙箱实例供开发者体验
