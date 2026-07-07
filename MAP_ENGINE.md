# 地图引擎设计（MAP_ENGINE.md）

> Poetry Atlas of China — 地图可视化与交互引擎

---

# 一、设计目标

| 目标 | 说明 |
| ---- | ---- |
| 高性能 | 5 万+ 诗词、3000+ 地点在 60fps 流畅渲染 |
| 多模式 | 气泡 / 热力 / 诗词云 / 轨迹 四种可视化模式 |
| 响应式 | 桌面端 + 移动端 + 触屏适配 |
| 可访问 | 键盘导航、屏幕阅读器友好 |
| 离线友好 | 支持 PWA + 离线底图缓存（景区网络不稳定） |

---

# 二、技术选型

| 模块 | 选型 | 理由 |
| ---- | ---- | ---- |
| 渲染引擎 | **MapLibre GL JS** | Mapbox GL 开源分支、无 Key 限制、矢量渲染 |
| 3D 可视化 | **Deck.gl** | 热力图、轨迹、点聚合、GPU 加速 |
| 几何计算 | **Turf.js** | 距离、缓冲区、路径插值 |
| 坐标系 | **GCJ-02** → **WGS-84** | 国内合规 + 开源底图兼容 |
| 瓦片源 | GISpande / 天地图（国内）+ OpenStreetMap | 合规底图 + 海外访问 |
| 动画 | **Framer Motion** + **d3-interpolate** | 时间轴插值、相机移动 |

---

# 三、坐标系统

## 3.1 坐标系映射

国内地图存在坐标系偏移（GCJ-02 火星坐标系），需要统一处理：

```typescript
// lib/coordinate.ts
// WGS-84（GPS 原始）↔ GCJ-02（国内偏移）互转
export function wgs84ToGcj02(lng: number, lat: number): [number, number];
export function gcj02ToWgs84(lng: number, lat: number): [number, number];

// 存储统一使用 WGS-84
// 显示根据底图类型自动转换
```

## 3.2 数据库存储

```sql
-- Place 表同时存储 WGS-84 坐标与 PostGIS 几何
ALTER TABLE "Place" ADD COLUMN geom geometry(Point, 4326);
-- 4326 即 WGS-84
```

---

# 四、底图设计

## 4.1 基础底图样式

```json
{
  "version": 8,
  "name": "Poetry Atlas Light",
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256
    }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#f8f6f0" } },
    { "id": "osm", "type": "raster", "source": "osm" }
  ]
}
```

## 4.2 古地图层（Phase 2+）

- 使用中国历史地理信息系统（CHGIS）数据
- 按朝代切换历史底图
- 支持与现代地图叠加对比（50% 透明度滑动条）

## 4.3 底图主题

| 主题 | 适用场景 | 配色风格 |
| ---- | -------- | -------- |
| 水墨 | 默认 | 米白底 + 青灰线条 |
| 夜景 | 夜间浏览 | 深蓝底 + 金色标注 |
| 古意 | 古地图模式 | 仿古宣纸 + 朱砂红 |
| 简洁 | 数据叠加 | 灰白底 + 高对比度 |

---

# 五、图层体系

## 5.1 图层分层

```
┌─────────────────────────────────────────┐
│  Overlay UI（时间轴、筛选器）             │  HTML / React
├─────────────────────────────────────────┤
│  Interaction Layer（选中高亮、Popup）     │  MapLibre Layer
├─────────────────────────────────────────┤
│  Data Layer（气泡/热力/轨迹/诗词云）       │  Deck.gl / MapLibre
├─────────────────────────────────────────┤
│  Annotation Layer（地名标签、边界）        │  MapLibre Layer
├─────────────────────────────────────────┤
│  Base Layer（底图 + 地形）               │  Raster / Vector Tile
└─────────────────────────────────────────┘
```

## 5.2 气泡图层（Bubble Layer）

```typescript
// 数据驱动气泡大小
const bubbleLayer = new MapLibreGL.CircleLayer({
  id: 'poem-bubbles',
  source: 'places',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['get', 'poem_count'],
      0, 4,
      100, 12,
      500, 24,
      1000, 36
    ],
    'circle-color': [
      'interpolate', ['linear'], ['get', 'poem_count'],
      0, '#e8d5b7',
      500, '#c9a961',
      1000, '#8b6914'
    ],
    'circle-opacity': 0.75,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
});
```

## 5.3 热力图层（Heatmap Layer）

```typescript
const heatmapLayer = new DeckGL.HeatmapLayer({
  id: 'poetry-heatmap',
  data: placesWithWeight,
  getPosition: d => [d.longitude, d.latitude],
  getWeight: d => d.poem_count,
  radiusPixels: 50,
  intensity: 1,
  threshold: 0.05,
  colorRange: [
    [255, 247, 236],
    [254, 232, 200],
    [253, 212, 158],
    [253, 187, 132],
    [252, 141, 89],
    [239, 101, 72],
    [179, 0, 0]
  ]
});
```

## 5.4 聚合气泡（Cluster）

```typescript
// 缩放级别 < 6 时启用聚合
map.addSource('places', {
  type: 'geojson',
  data: placesGeoJSON,
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14
});

// 聚合圈
map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'places',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#ffd700', 100, '#f08080', 500, '#ff4500'
    ],
    'circle-radius': [
      'step', ['get', 'point_count'],
      20, 100, 30, 500, 40
    ]
  }
});
```

## 5.5 作者轨迹图层（Arc Layer）

```typescript
const trajectoryLayer = new DeckGL.ArcLayer({
  id: 'author-trajectory',
  data: trajectorySegments,
  getSourcePosition: d => d.from,
  getTargetPosition: d => d.to,
  getSourceColor: [214, 140, 60],
  getTargetColor: [100, 180, 120],
  getWidth: 3,
  getHeight: 0.5
});
```

## 5.6 诗词云图层

```typescript
const textLayer = new DeckGL.TextLayer({
  id: 'poetry-cloud',
  data: quotes,
  getPosition: d => [d.longitude, d.latitude],
  getText: d => d.content,
  getSize: 16,
  getColor: [80, 60, 40, 200],
  getAngle: d => d.rotation,
  fontFamily: 'Noto Serif SC',
  fontWeight: 500,
  outlineWidth: 2,
  outlineColor: [255, 255, 255, 180]
});
```

---

# 六、交互设计

## 6.1 手势与快捷键

| 操作 | 桌面 | 触屏 |
| ---- | ---- | ---- |
| 缩放 | 滚轮 / +/- | 双指捏合 |
| 拖拽 | 左键拖动 | 单指滑动 |
| 旋转 | Shift + 拖动 | 双指旋转 |
| 查看详情 | 单击 | 单指点击 |
| 快速定位 | Ctrl + F 搜索 | 搜索按钮 |
| 返回全国 | Esc | 返回按钮 |

## 6.2 缩放级别与显示策略

| Zoom | 显示内容 | 图层模式 |
| ---- | -------- | -------- |
| 3–4 | 全国主要城市 | 气泡（大） |
| 5–7 | 省级 + 核心景点 | 气泡 + 聚合 |
| 8–10 | 市级 + 山川河流 | 气泡 + 标签 |
| 11–13 | 具体景点 + 轨迹 | 轨迹 + 标签 |
| 14–16 | 单景点沉浸 | 诗词云 + 3D |

## 6.3 筛选交互

```
┌─────────────────────────────────────────────┐
│  [唐] [宋] [元] [明] [清] ...              │  ← 朝代时间轴
├─────────────────────────────────────────────┤
│  [全部] [李白] [杜甫] [苏轼] ...            │  ← 作者筛选
└─────────────────────────────────────────────┘
```

筛选切换时地图使用 **300ms 缓动过渡**，避免生硬跳变：

```typescript
// 切换朝代时的地图刷新
function switchDynasty(dynasty: string) {
  const filteredData = await fetchPlaces({ dynasty });
  
  // 1. 气泡淡出
  await animateLayerOpacity('poem-bubbles', 0, 200);
  
  // 2. 更新数据源
  map.getSource('places').setData(filteredData);
  
  // 3. 气泡淡入
  await animateLayerOpacity('poem-bubbles', 1, 300);
}
```

---

# 七、相机动画

## 7.1 飞行动画（Fly To）

用户点击省份 → 地图平滑飞行到目标：

```typescript
map.flyTo({
  center: [112.98, 28.11],  // 长沙
  zoom: 8,
  speed: 1.2,
  curve: 1.42,
  easing: t => t * (2 - t)  // easeOutQuad
});
```

## 7.2 作者人生动画

```typescript
async function playAuthorLife(authorId: string) {
  const waypoints = await fetchAuthorWaypoints(authorId);
  
  for (const point of waypoints) {
    map.flyTo({
      center: [point.lng, point.lat],
      zoom: 10,
      duration: 2000
    });
    
    // 显示该地点的诗词
    showPopup(point);
    
    // 暂停
    await sleep(3000);
  }
}
```

## 7.3 时间轴动画

拖动时间轴时，地图连续变化：

```typescript
// 使用时间插值实现平滑过渡
const interpolator = d3.interpolateNumber(startYear, endYear);

requestAnimationFrame animate => {
  const year = interpolator(progress);
  updateMapForYear(year);
  if (progress < 1) {
    requestAnimationFrame(animate);
  }
};
```

---

# 八、性能优化

## 8.1 数据加载策略

| 策略 | 说明 |
| ---- | ---- |
| 视口裁剪 | 仅加载当前可视范围内的地点数据 |
| 分级加载 | 低zoom用聚合数据，高zoom用详细数据 |
| 分页瓦片 | 动态生成 MVT，PostGIS 空间裁剪 |
| 客户端缓存 | React Query 缓存已查询数据 |
| 地理哈希 | 使用 H3 网格聚合超密集点 |

## 8.2 渲染优化

| 策略 | 说明 |
| ---- | ---- |
| GPU 加速 | Deck.gl 的 WebGL 渲染 |
| 实例化 | 同类型气泡合并 draw call |
| 离屏渲染 | 静态层预渲染到纹理 |
| 帧率自适应 | 移动端自动降帧到 30fps |
| 符号避让 | 标签碰撞检测（MapLibre 内置） |

## 8.3 关键指标

| 指标 | 目标 |
| ---- | ---- |
| FCP（首次内容绘制） | < 1.5s |
| LCP（最大内容绘制） | < 2.5s |
| TTI（可交互时间） | < 3s |
| 地图帧率 | ≥ 50fps（桌面）/ 30fps（移动） |
| API P95 延迟 | < 200ms |

---

# 九、数据协议

## 9.1 地点 GeoJSON 输出

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [120.15, 30.25] },
      "properties": {
        "id": "uuid",
        "name": "杭州",
        "name_en": "Hangzhou",
        "type": "city",
        "poem_count": 538,
        "author_count": 92,
        "dynasty_distribution": { "唐": 128, "宋": 391 },
        "hot_quotes": ["欲把西湖比西子"]
      }
    }
  ]
}
```

## 9.2 API 端点

```
GET /api/v1/places
  ?bbox=110,20,125,35         # 视口范围
  &dynasty=唐                 # 朝代筛选
  &author_id=xxx              # 作者筛选
  &zoom=8                      # 缩放级别
  &mode=bubble                # 展示模式

GET /api/v1/places/:id/detail     # 地点详情
GET /api/v1/places/:id/poems      # 地点诗词列表
GET /api/v1/authors/:id/route     # 作者旅行路线
GET /api/v1/map/tile/:z/:x/:y     # MVT 瓦片
```

---

# 十、移动端适配

## 10.1 响应式布局

```css
/* 移动端：全屏地图 + 底部抽屉 */
@media (max-width: 768px) {
  .map-container { height: 100dvh; }
  .detail-panel {
    position: fixed;
    bottom: 0;
    height: 50vh;
    border-radius: 16px 16px 0 0;
  }
}

/* 桌面端：地图 + 右侧 Drawer */
@media (min-width: 769px) {
  .map-container { width: calc(100% - 400px); }
  .detail-panel {
    position: fixed;
    right: 0;
    width: 400px;
    height: 100vh;
  }
}
```

## 10.2 移动端交互优化

- 双指缩放优先于按钮
- 底部抽屉支持拖拽展开/收起
- 筛选器折叠为图标 + 弹窗
- 最大触摸目标 44px

---

# 十一、无障碍设计

- 地图提供**文字替代导航**（地点列表模式）
- 所有交互元素键盘可达
- 颜色对比度 ≥ 4.5:1
- ARIA 标注地图标记语义
- 诗词提供文字版本（非仅图片）

---

# 十二、离线与 PWA

- Service Worker 缓存底图瓦片与核心数据
- 弱网模式：降级为文字列表浏览
- 景区场景（网络不稳定）可预缓存当地数据
