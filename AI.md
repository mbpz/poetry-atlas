# AI 能力规划（AI.md）

> Poetry Atlas of China — AI 驱动文化教育与探索

---

# 一、AI 定位

> 不是让 AI 替代传统文化学习，而是让 AI 作为**穿越时空的导游**——帮用户理解诗词背后的故事、地理、情感与美学。

---

# 二、AI 能力全景

```
┌────────────────────────────────────────────────────────────────────┐
│                        AI Capability Map                            │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ 内容生成  │  │ 理解分析  │  │ 推荐发现  │  │ 交互对话     │      │
│  │          │  │          │  │          │  │              │      │
│  │ 白话翻译  │  │ 情感分类  │  │ 意象推荐  │  │ AI 导游对话  │      │
│  │ 赏析文章  │  │ 意象识别  │  │ 主题发现  │  │ 问答系统     │      │
│  │ 旅行故事  │  │ 典故解析  │  │ 相似诗词  │  │ 苏格拉底式   │      │
│  │ 语音讲解  │  │ 背景还原  │  │ 路线生成  │  │   追问       │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘      │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ 视觉生成  │  │ 知识抽取  │  │ 教育场景  │  │ 数据智能     │      │
│  │          │  │          │  │          │  │              │      │
│  │ 古诗配图  │  │ 地点抽取  │  │ 诗词课程  │  │ 质量审核     │      │
│  │ 历史场景  │  │ 人物关系  │  │ 互动问答  │  │ 数据补全     │      │
│  │ 动画路线  │  │ 事件抽取  │  │ 作文批改  │  │ 趋势分析     │      │
│  │ 数字人    │  │ 实体链接  │  │ 知识图谱  │  │ 用户画像     │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────────────┘
```

---

# 三、核心模块

---

## 3.1 AI 诗词解析（Poem Analysis）

### 输入
- 诗词原文 + 注释 + 作者信息

### 输出

```json
{
  "modern_translation": "白话译文",
  "keywords": ["关键词1", "关键词2"],
  "imagery": ["月亮", "柳树", "江水"],
  "emotion": { "primary": "思乡", "secondary": "孤独", "valence": -0.3 },
  "allusions": [
    { "phrase": "莼鲈之思", "source": "晋书·张翰传", "meaning": "思乡之情" }
  ],
  "background": "创作背景（历史语境）",
  "technique": ["对仗", "借景抒情", "用典"],
  "significance": "文学史地位"
}
```

### Prompt 模板

```
# Role
你是一位精通中国古代文学的学者。请对以下诗词进行全方位解读。

# Input
标题：{title}
作者：{author}（{dynasty}）
正文：{content}
注释：{annotation}

# Requirements
1. 现在白话文翻译（信达雅）
2. 典故识别（每条标明出处与含义）
3. 情感分析（主/次情感 + 正负面倾向）
4. 意象识别（自然/人文意象分类）
5. 创作背景（基于史料推测）
6. 艺术手法（修辞/结构/音律）

# Output Format
返回 JSON，遵循以下 schema：
{schema}
```

---

## 3.2 AI 地点解读（Place Narration）

### 输入
- 地点 + 关联诗词列表 + 历史背景

### 输出
- **短介绍**（100 字）：用于地点卡片
- **长故事**（500–100 字）：用于详情页

### Prompt

```
# Role
你是一位资深文化旅行作家。请根据以下诗词，写一段关于{place_name}的文化解读。

# Input
地点：{place_name}（{modern_name}）
坐标：{longitude}, {latitude}
关联诗词：
{poems}
历史事件：{events}

# Requirements
1. 开头用一句古诗引入
2. 解释为什么诗人反复书写此处
3. 串联不同朝代的作品
4. 邀请读者实地探访
5. 文风：兼具学术性与诗意，200 字以内

# Output
```

---

## 3.3 AI 意象网络（Imagery Network）

### 输入
- 意象词（如"月亮"）

### 输出
- 相关诗词 Top 50
- 共现意象（如月亮 ↔ 思乡 ↔ 酒 ↔ 夜晚）
- 可视化网络图数据

### 算法流程

```
1. Query PoemTag WHERE tag = '月亮'
2. JOIN Poem 获取全文
3. 对每首诗再做 Tag 统计 → 共现矩阵
4. 筛选共现频率 > 阈值
5. 返回图结构：{ nodes, edges }
```

---

## 3.4 AI 旅行规划（Travel Planner）

### 输入
- 主题（如"李白长江行"）
- 天数
- 出发城市

### 输出

```json
{
  "title": "李白长江壮游行",
  "days": [
    {
      "day": 1,
      "city": "成都",
      "poems": ["《蜀道难》", "《春夜喜雨》"],
      "route": "成都 → 峨眉山",
      "description": "...",
      "coordinates": [104.07, 30.65]
    }
  ],
  "total_distance_km": 1200,
  "map_animation": { /* 动画参数 */ }
}
```

### Agent 设计（LangGraph）

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│ 意图识别    │────▶│ 路线规划    │────▶│ 诗词匹配    │
│ (主题/天数) │     │ (地点排序)  │     │ (每站配诗)  │
└────────────┘     └────────────┘     └────────────┘
                                              │
                                              ▼
                                       ┌────────────┐
                                       │ 文案生成    │
                                       │ (故事+推荐) │
                                       └────────────┘
```

---

## 3.5 AI 导游对话（Conversational Guide）

### 场景

用户浏览"黄鹤楼"时，右侧出现 AI 导游：

```
用户: 李白为什么去黄鹤楼？
AI: 公元 742 年，李白送别好友孟浩然从武昌（今武汉）前往扬州。
    当时李白正值壮年，孟浩然是诗坛前辈。两人在黄鹤楼饮酒赋诗，
    留下了千古名篇《黄鹤楼送孟浩然之广陵》。
    你想看看这首诗在地图上的路线吗？
```

### 技术方案

- **RAG**：检索相关诗词、地点、历史事件作为上下文
- **LLM**：生成自然语言回答
- **Tool Use**：可调用地图 API 展示路线

### Prompt

```
# Role
你是 Poetry Atlas 的 AI 导游，一位博学多才的文化向导。

# Context
当前浏览地点：{place_name}
关联诗词：{poems}
历史背景：{events}
用户问题：{question}

# Rules
1. 回答基于事实，不编造
2. 引用具体诗句
3. 语气亲切、有文化感
4. 主动推荐相关内容
5. 回答控制在 200 字以内

# Output
```

---

## 3.6 AI 语音讲解（TTS）

### 方案

| 方案 | 说明 | 部署方式 |
| ---- | ---- | -------- |
| **Edge TTS**（微软） | 免费、质量稳定 | API 调用（推荐） |
| **OpenAI TTS** | 多语言、自然 | OpenRouter 代理 |
| **CosyVoice**（阿里） | 中文效果好、支持情感 | 通过 OpenRouter 调用 |

> **不自行部署 TTS 模型**，全部通过 API 调用。

### 使用场景

- 诗词朗读（男声/女声/童声）
- 地点讲解（导游语气）
- 睡前诗词（舒缓语气）

---

## 3.7 AI 视觉生成

### 场景

| 场景 | 模型 | 说明 | 调用方式 |
| ---- | ---- | ---- | -------- |
| 古诗配图 | Flux / Stable Diffusion 3 | 根据诗意生成水墨画 | OpenRouter / Replicate API |
| 历史场景复原 | 图像修复 API | 基于古画复原 | 第三方 API |
| 旅行路线图 | 地图渲染 + 标注 | 自动生成分享图 | 前端 Canvas / MapLibre |
| 数字人讲解 | HeyGen / D-ID | 虚拟教师 | SaaS API |

> **不自行部署图像生成模型**，全部通过 API 调用。

### Prompt 示例（古诗配图）

```
Traditional Chinese ink painting, style of Qi Baishi.
Scene: A lone boat on a misty river at night,
a bright moon hanging low, distant mountains fading into fog.
Poem inscribed in elegant calligraphy:
"孤帆远影碧空尽，唯见长江天际流"
Color palette: ink black, subtle indigo, rice paper texture.
Aspect ratio: 16:9.
```

---

# 四、AI 架构

> **架构约束**：遵循 `ARCHITECTURE.md` 中的 **Zero-Ops First** 原则。AI 服务全部由 **Next.js Route Handlers** 暴露，通过 **OpenRouter** 统一网关调用 LLM，**无需自建 AI 服务**。

## 4.1 整体架构

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Route Handlers (/api/ai/*)              │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ /analyze │  │ /chat    │  │ /plan            │ │  │
│  │  │ 诗词解析  │  │ AI 对话  │  │ 旅行规划         │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────────────┘ │  │
│  │       │             │              │               │  │
│  │  ┌────┴─────────────┴──────────────┴────────────┐  │  │
│  │  │        Vercel AI SDK (generateText / stream) │  │  │
│  │  └──────────────────┬──────────────────────────┘  │  │
│  └─────────────────────┼─────────────────────────────┘  │
│                        │                                 │
│  ┌─────────────────────┼─────────────────────────────┐  │
│  │   Server Actions    │                             │  │
│  │   (数据读写)        │                             │  │
│  └─────────┬──────────┴─────────────────────────────┘  │
│            │                                             │
└────────────┼─────────────────────────────────────────────┘
             │
    ┌────────┴────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌──────────────┐                  ┌──────────────┐
│  Supabase    │                  │  OpenRouter  │
│  PostgreSQL  │                  │  AI Gateway  │
│  + pgvector  │                  │              │
│  + RLS       │                  │  DeepSeek    │
│              │                  │  Claude      │
│              │                  │  Qwen        │
│              │                  │  GPT         │
└──────────────┘                  └──────────────┘
```

## 4.2 LLM 路由策略（通过 OpenRouter）

| 场景 | 国内模型 | 海外模型 | 理由 |
| ---- | -------- | -------- | ---- |
| 诗词解析 | `deepseek/deepseek-chat` | `anthropic/claude-sonnet-4-20250514` | 中文理解强 |
| 地点故事 | `qwen/qwen-plus` | `anthropic/claude-sonnet-4-20250514` | 文采好 |
| 旅行规划 | `deepseek/deepseek-chat` | `anthropic/claude-sonnet-4-20250514` | 推理强 |
| 对话导游 | `qwen/qwen-turbo` | `anthropic/claude-haiku-4-5-20251001` | 性价比 |
| 数据抽取 | `deepseek/deepseek-chat` | `anthropic/claude-sonnet-4-20250514` | 准确率高 |
| 视觉生成 | `stabilityai/stable-diffusion-3` | `openai/dall-e-3` | 图像质量 |

> **所有模型通过 OpenRouter 统一入口**，一个 API Key 切换，无需改代码。

## 4.3 RAG 架构

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Poem    │────▶│ Embedding│────▶│  Supabase    │
│  Place   │     │ (bge-    │     │  pgvector    │
│  Author  │     │  m3 /    │     │  (向量列)     │
│  Event   │     │  text-   │     │              │
│          │     │  embed-  │     │              │
│          │     │  v3)     │     │              │
└──────────┘     └──────────┘     └──────────────┘
                                       ▲
                                       │
┌──────────┐     ┌──────────┐     ┌────┴─────┐
│  User    │────▶│ Query    │────▶│ Semantic │
│  Query   │     │ Rewrite  │     │ Search   │
└──────────┘     └──────────┘     └──────────┘
```

> **向量存储使用 Supabase pgvector**，无需额外部署 Elasticsearch/OpenSearch。

---

# 五、Prompt 工程

## 5.1 Prompt 管理

```
prompts/
├── system/
│   ├── poem_analyzer.md
│   ├── place_narrator.md
│   ├── travel_planner.md
│   └── guide_chat.md
├── templates/
│   ├── analysis_v1.jinja2
│   └── narration_v1.jinja2
└── tests/
    ├── poem_analyzer_test.yaml
    └── place_narrator_test.yaml
```

## 5.2 Prompt 版本控制

- 使用 Jinja2 模板
- 版本号 + Git 标签
- A/B 测试框架
- 自动化评估（LLM-as-Judge）

---

# 六、评估体系

## 6.1 评估维度

| 维度 | 指标 | 目标 |
| ---- | ---- | ---- |
| 准确性 | 事实正确率 | > 95% |
| 文采 | 人工评分（1-5） | > 4.0 |
| 相关性 | 与查询相关度 | > 90% |
| 延迟 | P95 响应时间 | < 3s |
| 成本 | 每千次调用成本 | < ¥5 |

## 6.2 评估方法

- **自动评估**：LLM-as-Judge 打分
- **人工评估**：专家抽检
- **用户反馈**：👍/👎 按钮
- **A/B 测试**：新旧 Prompt 对比

---

# 七、成本优化

| 策略 | 说明 |
| ---- | ---- |
| 缓存 | 相同查询返回缓存（Supabase `ai_cache` 表 + Vercel KV） |
| 分级 | 简单查询用小模型（DeepSeek/Qwen），复杂用大模型（Claude/GPT） |
| 批处理 | 数据抽取任务通过 GitHub Actions 离线批量处理 |
| Pre-generation | 热门地点/诗词的 AI 内容提前生成并存入数据库，用户首次访问即命中 |
| Prompt 缓存 | 利用 OpenRouter 的 prompt caching 减少重复 Token 计费 |

---

# 八、安全与伦理

| 维度 | 措施 |
| ---- | ---- |
| 内容安全 | 输出过滤，避免不当内容 |
| 事实核查 | 关键事实标注来源 |
| 版权 | 生成内容标注 AI 辅助 |
| 隐私 | 用户对话数据脱敏 |
| 文化尊重 | 避免对传统文化的误读 |

---

# 九、Milestone

| 阶段 | 时间 | 能力 |
| ---- | ---- | ---- |
| AI-1 | M2 | 诗词解析 API（白话+典故） |
| AI-2 | M3 | 地点解读 + 语音朗读 |
| AI-3 | M4 | 知识图谱 + 意象网络 |
| AI-4 | M4 | AI 导游对话（RAG） |
| AI-5 | M5 | 旅行规划 Agent |
| AI-6 | V2 | 视觉生成 + 数字人 |
