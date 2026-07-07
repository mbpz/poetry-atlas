# 数据采集与清洗流程（DATA_PIPELINE.md）

> Poetry Atlas of China — 数据从获取到入库的全链路设计

---

# 一、整体流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  数据源   │───▶│  采集     │───▶│  清洗     │───▶│  关联     │───▶│  入库     │
│  (古籍网/ │    │  (爬虫/   │    │  (规则+   │    │  (LLM +  │    │  (PG/     │
│   数据库) │    │   API)   │    │   人工)   │    │   规则)   │    │   OS)    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────┐
                                                               │  质量     │
                                                               │  监控     │
                                                               └──────────┘
```

---

# 二、数据源

## 2.1 诗词数据

| 数据源 | 类型 | 规模 | 许可证 | 采集方式 |
| ------ | ---- | ---- | ------ | -------- |
| 古诗文网 (gushiwen.cn) | 网页 | 10 万+ | 爬虫友好（合规速率） | 爬虫 |
| 中国哲学书电子化计划 (ctext.org) | 网页/API | 万级 | CC | API/Open Data |
| 全唐诗 / 全宋词数据库 | 数据库 | 5 万+ | 开放 | 数据库开放接口 |
| Wikisource | HTML | 万级 | CC-BY-SA | API |
| 国家公共文化数据 | 开放数据 | 万级 | 政府开放 | API |

## 2.2 地名数据

| 数据源 | 说明 |
| ------ | ---- |
| **CHGIS** | 中国历史地理信息系统，含历代政区边界 |
| **GeoNames** | 全球地名库（含中国） |
| **高德/天地图 API** | 现代地名坐标、古地名 → 现代地名映射 |
| **读秀/知网** | 历史地名考据 |

## 2.3 作者数据

| 数据源 | 说明 |
| ------ | ---- |
| 古诗文网作者页 | 基本信息 |
| 维基百科 / WikiData | 生平、生卒年 |
| 《唐诗纪事》《宋诗纪事》 | 作者事迹 |
| CBDB（中国历代人物传记数据库） | 结构化传记 |

## 2.4 历史事件数据

| 数据源 | 说明 |
| ------ | ---- |
| 《资治通鉴》 | 编年史 |
| 维基百科事件列表 | 结构化 |
| 自定义事件库 | 团队维护 |

---

# 三、采集层设计

## 3.1 采集架构

> **约束**：遵循 `ARCHITECTURE.md` 中的 **Zero-Ops First** 原则。**不在 Vercel 上运行任何爬虫任务**，全部通过 **GitHub Actions** 离线执行。

```
┌────────────────────────────────────────────────────────────┐
│                    GitHub Actions (定时 / 手动)              │
│                                                            │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  Cron: 每天 22:00 UTC (北京时间 06:00)              │  │
│   │  workflow_dispatch: 支持手动触发                     │  │
│   └───────────────────────┬─────────────────────────────┘  │
│                           │                                │
│        ┌──────────────────┼──────────────────┐             │
│        ▼                  ▼                  ▼             │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐         │
│   │ Scrapy  │       │ HTTP    │       │ 开放数据 │         │
│   │ Spider  │       │ Client  │       │ 文件下载 │         │
│   │ (Python)│       │ (API)   │       │         │         │
│   └────┬────┘       └────┬────┘       └────┬────┘         │
│        │                  │                  │              │
│        └──────────────────┼──────────────────┘              │
│                           ▼                                │
│                    ┌─────────────┐                         │
│                    │ Raw Storage │                         │
│                    │ (Cloudflare │                         │
│                    │  R2 免费)   │                         │
│                    └─────────────┘                         │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 清洗 + LLM 地点抽取 + 关联
                           │
                           ▼
                 写入 Supabase + 生成静态 JSON
                           │
                           ▼
                  git commit + push → Vercel 自动部署
```

## 3.2 采集代码示例（Python）

```python
# pipelines/poem_scraper.py
import scrapy
from scrapy.http import Request

class GushiwenSpider(scrapy.Spider):
    name = 'gushiwen'
    allowed_domains = ['gushiwen.cn']
    start_urls = ['https://so.gushiwen.cn/gushi/']
    custom_settings = {
        'DOWNLOAD_DELAY': 1.5,          # 礼貌爬取
        'CONCURRENT_REQUESTS': 2,
        'ROBOTSTXT_OBEY': True,
        'USER_AGENT': 'PoetryAtlas/1.0 (+https://poetryatlas.cn)',
    }

    def parse(self, response):
        for poem in response.css('.left .sons'):
            yield {
                'title': poem.css('p a b::text').get(),
                'content': '\n'.join(poem.css('p:nth-child(2)::text').getall()),
                'author': poem.css('p.source a::text').get(),
                'dynasty': poem.css('p.source a::text').getall()[1] if len(response.css('p.source a::text').getall()) > 1 else '',
                'url': poem.css('p a::attr(href)').get(),
            }

        # 翻页
        next_page = response.css('a.amore::attr(href)').get()
        if next_page:
            yield Request(response.urljoin(next_page), callback=self.parse)

    def parse_detail(self, response):
        """解析诗词详情页：注释、译文、赏析"""
        yield {
            'title': response.css('.main3 .shileft .cont h1::text').get(),
            'content': '\n'.join(response.css('.main3 .shileft .cont p:nth-child(2)::text').getall()),
            'annotation': '\n'.join(response.css('.main3 .shileft .cont .contson::text').getall()),
            'translation': response.css('#contson.translation::text').get(),
            'appreciation': response.css('#contson.appreciation::text').get(),
        }
```

## 3.3 采集规范

| 规则 | 说明 |
| ---- | ---- |
| 限速 | 单域名 ≤ 2 req/s |
| 重试 | 3 次指数退避 |
| 去重 | URL + MD5 内容指纹 |
| 增量 | 仅抓取新增/变更数据 |
| 断点续传 | 使用 Scrapy 的 JOBDIR |
| 礼貌池 | 代理 IP 池 + User-Agent 轮换 |
| 法律合规 | 遵守 robots.txt，仅采集公开数据 |

---

# 四、清洗层设计

## 4.1 清洗流程

```
Raw JSON ──▶ 格式标准化 ──▶ 去重 ──▶ 字段补全 ──▶ 验证 ──▶ Clean Data
```

## 4.2 清洗规则

### 文本清洗

```python
# cleaners/text_cleaner.py
import re
import unicodedata

def clean_text(text: str) -> str:
    """诗词正文清洗"""
    # 1. Unicode 标准化
    text = unicodedata.normalize('NFKC', text)
    
    # 2. 去除网页残留标签
    text = re.sub(r'<[^>]+>', '', text)
    
    # 3. 去除控制字符
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    
    # 4. 统一标点
    text = text.replace('﹔', '；').replace('﹖', '？')
    
    # 5. 去除多余空白
    text = re.sub(r'\s+', '\n', text).strip()
    
    # 6. 去除网页页码/引用号
    text = re.sub(r'\[\d+\]', '', text)
    
    return text
```

### 作者名归一化

```python
# 姓名变体映射
AUTHOR_ALIASES = {
    '太白': '李白',
    '子美': '杜甫',
    '东坡居士': '苏轼',
    '易安居士': '李清照',
}

def normalize_author(name: str) -> str:
    name = name.strip()
    return AUTHOR_ALIASES.get(name, name)
```

### 朝代标准化

```python
DYNASTY_MAPPING = {
    '唐代': '唐',
    '唐朝': '唐',
    '宋代': '宋',
    '宋代（北宋）': '宋',
    '宋代（南宋）': '宋',
    '先秦': '先秦',
}

def normalize_dynasty(dynasty: str) -> str:
    dynasty = dynasty.strip().replace('朝', '').replace('代', '')
    return DYNASTY_MAPPING.get(dynasty, dynasty)
```

### 去重策略

```python
import hashlib

def poem_fingerprint(title: str, author: str, content: str) -> str:
    """生成诗词唯一指纹：作者+标题+正文前20字"""
    key = f"{author}::{title}::{content[:20]}"
    return hashlib.md5(key.encode('utf-8')).hexdigest()
```

---

# 五、关联层设计

## 5.1 诗词-地点关联

这是最核心也是最困难的环节：

```
                   ┌──────────────┐
                   │   地点词典    │
                   │  (古地名 +   │
                   │   现代地名)   │
                   └──────┬───────┘
                          │
   ┌──────────┐           │           ┌──────────────┐
   │ 规则匹配  │───────────┼──────────▶│  高置信度     │
   │ (诗中直接 │           │           │  (>0.9)      │
   │  出现地名)│           │           └──────────────┘
   └──────────┘           │
                          │           ┌──────────────┐
                   ┌──────┴───────┐   │  中置信度     │
                   │  LLM 判定     ├──▶│  (0.5-0.9)   │
                   │  (注释+背景    │   │  待人工审核   │
                   │   分析)       │   └──────────────┘
                   └──────────────┘
```

## 5.2 LLM 地点抽取 Prompt

```python
PLACE_EXTRACTION_PROMPT = """
你是一位中国古代文学专家。请从以下诗词文本中提取所有涉及的地点信息。

诗词标题：{title}
正文：{content}
注释：{annotation}

请以 JSON 格式返回：
{
  "places": [
    {
      "name": "地点名称（原始词）",
      "relation": "creation/description/passing/farewell/destination/origin/reference",
      "confidence": 0.0-1.0,
      "note": "判断依据"
    }
  ]
}

关系类型说明：
- creation: 创作地
- description: 描写地
- passing: 途经地
- farewell: 送别地
- destination: 目的地
- origin: 出发地
- reference: 典故引用
- residence: 居住地

只提取有明确地理意义的地点，不要提取隐喻、比喻性词语。
"""
```

## 5.3 地点映射表

```python
# 古地名 → 现代地名 映射
ANCIENT_PLACE_MAPPING = {
    '长安': {'modern': '西安', 'lng': 108.94, 'lat': 34.26, 'period': '唐'},
    '金陵': {'modern': '南京', 'lng': 118.80, 'lat': 32.06, 'period': '六朝'},
    '建康': {'modern': '南京', 'lng': 118.80, 'lat': 32.06, 'period': '六朝'},
    '临安': {'modern': '杭州', 'lng': 120.15, 'lat': 30.25, 'period': '宋'},
    '姑苏': {'modern': '苏州', 'lng': 120.62, 'lat': 31.32, 'period': '隋唐'},
    '汴京': {'modern': '开封', 'lng': 114.35, 'lat': 34.79, 'period': '宋'},
    '幽州': {'modern': '北京', 'lng': 116.40, 'lat': 39.90, 'period': '唐'},
    '益州': {'modern': '成都', 'lng': 104.07, 'lat': 30.65, 'period': '汉'},
    '广陵': {'modern': '扬州', 'lng': 119.42, 'lat': 32.39, 'period': '唐'},
    '锦官城': {'modern': '成都', 'lng': 104.07, 'lat': 30.65, 'period': '唐'},
}
```

---

# 六、入库层设计

## 6.1 ETL 流程

```python
# scripts/etl/transform_and_load.py
# 在 GitHub Actions 中为独立 Python 进程执行
def run_etl(batch_size: int = 100):
    """主 ETL 流程（在 GitHub Actions Runner 中执行，无 Serverless 超时限制）"""
    raw_poems = storage.list_raw('poems/')   # 从 Cloudflare R2 读取原始数据
    
    for batch in chunked(raw_poems, batch_size):
        cleaned = [clean_poem(p) for p in batch]
        deduped = deduplicate(cleaned)
        
        for poem in deduped:
            # 1. 写入 Supabase
            poem_id = supabase.table('poem').insert(poem).execute()
            
            # 2. 地点关联（通过 OpenRouter 调用 LLM 抽取）
            extract_places_for_poem(poem_id)   # 同步调用，Actions Runner 无时间限制
            
            # 3. 标签提取
            extract_tags_for_poem(poem_id)
    
    # 4. 重新生成静态 JSON（写入 public/data/，供下次部署使用）
    generate_static_json()
    
    # 5. 刷新 Supabase 物化视图
    supabase.rpc('refresh_place_poem_stats')
```

## 6.2 增量更新

```python
# scripts/etl/incremental.py
def incremental_update():
    """增量更新：仅处理新增/变更数据（在 GitHub Actions 中执行）"""
    last_sync = supabase.table('sync_metadata').select('last_sync').execute()
    
    new_sources = source.scan(since=last_sync)
    
    for src in new_sources:
        if src.is_deleted:
            supabase.table('poem').update({'deleted_at': 'now()'}).eq('id', src.id).execute()
        elif src.is_modified:
            supabase.table('poem').update(src.data).eq('id', src.id).execute()
        else:
            supabase.table('poem').insert(src.data).execute()
    
    supabase.table('sync_metadata').update({'last_sync': 'now()'}).execute()
```

---

# 七、质量监控

## 7.1 数据质量维度

| 维度 | 指标 | 目标 |
| ---- | ---- | ---- |
| 完整性 | 必填字段缺失率 | < 1% |
| 准确性 | 人工抽检正确率 | > 95% |
| 一致性 | 作者-朝代-作品匹配率 | > 99% |
| 时效性 | 新增数据入库延迟 | < 24h |
| 唯一性 | 去重后重复率 | < 0.1% |
| 关联性 | 地点关联覆盖率（有明确地点的诗） | > 60% |

## 7.2 质量检查脚本

```python
# quality/check.py
async def run_quality_checks():
    checks = [
        check_required_fields(),
        check_dynasty_year_consistency(),
        check_author_poem_count(),
        check_place_coordinates(),
        check_duplicate_poems(),
        check_orphan_relations(),
    ]
    
    results = await asyncio.gather(*checks)
    
    # 推送告警
    for result in results:
        if not result.passed:
            await alert.send(result)
```

## 7.3 数据仪表板

- 整体数据量趋势图
- 各朝代诗词分布
- 各地点诗词 Top 100
- 数据质量周报
- 任务执行日志

---

# 八、人工审核平台

对于 LLM 抽取的低置信度结果，需要人工审核：

```
┌──────────────────────────────────────────────────────┐
│                  审核工作台                           │
│                                                      │
│  ┌────────────────────┐  ┌────────────────────────┐  │
│  │ 原始诗词           │  │ LLM 抽取结果            │  │
│  │                    │  │                        │  │
│  │ 《黄鹤楼送孟浩然》  │  │ ✓ 黄鹤楼 (送别地) 0.95 │  │
│  │  故人西辞黄鹤楼    │  │ ✓ 扬州   (目的地)   0.90 │  │
│  │  烟花三月下扬州    │  │ ✗ 金陵   (描写地)   0.40 │  │
│  │                    │  │ ? 长江   (描写地)   0.65 │  │
│  └────────────────────┘  └────────────────────────┘  │
│                                                      │
│  [✓ 确认] [✗ 拒绝] [✏️ 编辑] [⏭️ 下一条]            │
└──────────────────────────────────────────────────────┘
```

---

# 九、数据安全

| 层面 | 措施 |
| ---- | ---- |
| 采集合规 | 遵守 robots.txt，不采集版权受保护内容 |
| 存储加密 | Supabase 静态加密（免费内置） |
| 访问控制 | Supabase RLS（行级安全策略） |
| 备份策略 | Supabase 每日自动备份（免费） |
| 审计日志 | Supabase Audit Log + 触发器记录变更 |
| 敏感配置 | GitHub Secrets（API Key 等） |

---

# 十、技术栈

> **约束**：技术选型遵循 `ARCHITECTURE.md` 中的 **Zero-Ops First** 原则。

| 模块 | 技术 | 理由 |
| ---- | ---- | ---- |
| 定时调度 | **GitHub Actions Cron** | 零成本、零运维 |
| 爬虫框架 | **Scrapy (Python)** | 成熟、兼容 GitHub Actions |
| 数据处理 | **Polars** | 比 Pandas 快、内存占用低 |
| ETL 编排 | **GitHub Actions Steps** | 无需额外调度器 |
| AI 调用 | **OpenRouter API** | 统一网关、按调用付费 |
| 质量监控 | **自定义脚本** | 轻量、足够 |
| 原始存储 | **Cloudflare R2**（免费出口） | 备份爬取数据 |
| 主数据库 | **Supabase PostgreSQL** | 内置 Auth/Storage/RLS |
| ORM | **Drizzle** | Serverless 友好 |
| 部署触发 | **GitHub Push → Vercel** | 全自动 |

---

# 十一、Milestone

> **所有数据任务通过 GitHub Actions 完成，不占用 Vercel 资源**。

| 阶段 | 时间 | 任务 | 产出 | 执行方式 |
| ---- | ---- | ---- | ---- | -------- |
| DP-1 | M1 | 采集脚本 + 清洗 | 5 万首诗词入库 | GitHub Actions |
| DP-2 | M2 | 作者/地名库 | 5000 作者 + 3000 地点 | GitHub Actions |
| DP-3 | M2 | 地点关联（规则） | 8 万条关联（高置信度） | GitHub Actions |
| DP-4 | M3 | LLM 地点抽取（OpenRouter） | 15 万条关联 | GitHub Actions |
| DP-5 | M3 | 人工审核平台（Next.js Admin） | 审核通过率 > 90% | Supabase + Admin UI |
| DP-6 | M4 | 知识图谱自动构建 | 图谱节点 10 万+ | GitHub Actions |
| DP-7 | M5 | 增量更新 + 质量监控 | 自动化流水线（Cron + Push） | GitHub Actions |
