# 中国古诗词地图（Poetry Atlas of China）

> 在地图上阅读中国，在诗词中穿越历史。

---

# 一、项目愿景（Vision）

打造中国最大的古诗词空间知识库。

用户不是通过：
- 作者
- 朝代
- 诗名

寻找诗词。

而是：

**从地图进入中国。**

打开网站，就是一张中国地图。

点击任意地方：

西湖

↓

杭州

↓

浙江

↓

中国

即可看到：

- 与该地点相关的全部诗词
- 历史人物
- 朝代分布
- 创作背景
- AI 解读
- 旅行路线
- 历史变迁

最终形成：

> 中国诗词时空知识图谱（Chinese Poetry Knowledge Graph）

---

# 二、产品目标

核心目标：

建立：

空间（Where）
+
时间（When）
+
人物（Who）
+
作品（What）

四维浏览体系。

---

# 三、Roadmap

---

# Phase 0 数据建设（Data Foundation）

目标：

建立可靠的数据底座。

## 0.1 收集诗词

数据来源：

- 古诗文网
- 中国哲学书电子化计划
- 开放古诗数据
- Wikisource
- 国家公共文化数据

建立：

Poem

包含：

- 标题
- 正文
- 作者
- 朝代
- 年份
- 注释
- 翻译
- 赏析

---

## 0.2 作者数据库

建立：

Author

字段：

- 姓名
- 朝代
- 生卒
- 籍贯
- 生平
- 图片

---

## 0.3 地名数据库

建立：

Place

支持：

现代地名：

北京
杭州
武汉

古地名：

长安
金陵
建康
姑苏
临安

支持：

现代映射

例如：

长安

↓

西安

---

## 0.4 经纬度

所有地点：

拥有：

Latitude

Longitude

方便地图定位。

---

## 0.5 地点分类

分类：

City

Mountain

River

Lake

Temple

Tower

Ancient City

County

Province

Historic Site

---

## 0.6 诗词地点关联

建立：

PoemPlace

例如：

《黄鹤楼送孟浩然》

关联：

黄鹤楼

武汉

长江

扬州

关系：

创作地

描写地

送别地

经过地

---

# Phase 1 MVP

目标：

地图浏览诗词。

---

## 首页

全屏地图。

默认：

中国。

地图点：

显示：

诗词数量。

例如：

杭州（538）

西安（712）

成都（486）

---

## 点击地点

右侧 Drawer：

展示：

地点介绍

诗词数量

作者数量

热门诗词

---

## 地点详情

例如：

杭州。

展示：

全部诗词。

支持：

分页。

---

## 搜索

支持：

作者

地点

诗名

名句

---

## 朝代筛选

顶部：

先秦

汉

唐

宋

元

明

清

切换：

地图刷新。

---

## 作者筛选

例如：

李白

地图：

立即变成：

李白旅行地图。

---

# Phase 2 Beta

目标：

让地图真正活起来。

---

## 时间轴

底部：

Timeline

拖动：

唐

↓

宋

↓

元

↓

明

地图动态变化。

---

## 热力图

颜色：

表示：

诗词密度。

---

## 聚合气泡

缩小时：

自动聚合。

放大：

展开。

---

## 景点层

支持：

西湖

岳阳楼

黄鹤楼

寒山寺

滕王阁

赤壁

---

## 古今切换

按钮：

现代地图

↓

古地图

例如：

长安

洛阳

临安

自动显示。

---

## 作者轨迹

展示：

李白

苏轼

杜甫

旅行路线。

---

# Phase 3 V1

目标：

建立知识图谱。

---

## AI 地点介绍

自动生成：

为什么这里出现这么多诗？

AI 自动解释。

---

## AI 诗词解析

生成：

现代白话

典故

背景

情感分析

关键词

---

## AI 意象

例如：

输入：

月亮

展示：

所有月亮相关诗。

形成：

意象网络。

---

## 知识图谱

节点：

作者

地点

诗词

事件

人物

关系：

可视化。

---

## 事件

例如：

安史之乱

关联：

全部诗词。

---

## 地图动画

例如：

李白一生。

地图自动播放。

---

# Phase 4 AI Native

目标：

AI 驱动文化探索。

---

## AI 导游

输入：

杭州怎么玩？

AI：

生成：

诗词路线。

例如：

断桥

↓

孤山

↓

苏堤

↓

雷峰塔

↓

钱塘江

并配：

古诗。

---

## AI 旅行

输入：

跟着苏轼去旅行。

生成：

完整路线。

---

## AI 对话

例如：

"李白为什么去黄鹤楼？"

AI：

结合历史回答。

---

## AI 地图生成

输入：

杜甫一生。

自动生成：

地图。

---

## AI 推荐

用户浏览：

黄鹤楼。

推荐：

岳阳楼

滕王阁

形成：

江南三大名楼专题。

---

# Phase 5 数字人文平台

目标：

成为开放平台。

---

开放：

REST API

GraphQL

开放：

知识图谱 API。

---

开放：

地图 SDK。

---

开放：

Embedding Search。

---

开放：

MCP Server。

供：

Claude

Cursor

ChatGPT

调用。

---

# 四、数据库设计

Poem

Author

Place

Dynasty

PoemPlace

Tag

Image

HistoricalEvent

TravelRoute

Quote

Idiom

Source

KnowledgeGraphEdge

KnowledgeGraphNode

---

# 五、技术架构

Frontend

- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Mapbox GL / MapLibre GL
- Deck.gl
- Framer Motion

Backend

- NestJS（或 FastAPI）
- PostgreSQL
- PostGIS
- Redis
- Elasticsearch / OpenSearch

Storage

- MinIO / S3
- Cloudflare R2

Search

全文搜索：

OpenSearch

地图：

PostGIS

缓存：

Redis

---

# 六、AI 架构

LLM：

DeepSeek

Qwen

GLM

Claude

GPT

Agent：

LangGraph

PydanticAI

OpenAI Agents SDK

Workflow：

n8n

Temporal

MCP：

Poetry MCP Server

Knowledge Graph MCP

---

# 七、未来功能

✅ 古地图

✅ 古代行政区

✅ 朝代边界

✅ 河流变化

✅ AI 语音讲解

✅ AI 导游

✅ AI 视频

✅ AI 时间回放

✅ 作者人生动画

✅ VR 看诗词

✅ AR 景区

---

# 八、Milestone

M1（2 周）

完成数据库设计

完成地图

完成诗词导入

---

M2（4 周）

地图浏览

地点详情

搜索

朝代切换

---

M3（6 周）

热力图

聚合

时间轴

作者路线

---

M4（8 周）

AI 解读

知识图谱

关系图

---

M5（12 周）

开放 API

MCP

AI Agent

上线 Beta

---

# 九、最终目标

打造一个兼具文化传播、教育学习、文旅探索与数字人文研究价值的开放平台。

一句话概括：

> **让每一首古诗都有坐标，让每一片土地都有诗意。**
