"use client";

import { useState } from "react";

type PoemProps = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
};

// 名句数据库（经典名句高亮）
const FAMOUS_LINES: Record<string, string> = {
  "落霞与孤鹜齐飞，秋水共长天一色": "名句",
  "大漠孤烟直，长河落日圆": "名句",
  "春江潮水连海平，海上明月共潮生": "名句",
  "会当凌绝顶，一览众山小": "名句",
  "天生我材必有用，千金散尽还复来": "名句",
  "举头望明月，低头思故乡": "名句",
  "独在异乡为异客，每逢佳节倍思亲": "名句",
  "欲穷千里目，更上一层楼": "名句",
  "海内存知己，天涯若比邻": "名句",
  "但愿人长久，千里共婵娟": "名句",
  "不识庐山真面目，只缘身在此山中": "名句",
  "路漫漫其修远兮，吾将上下而求索": "名句",
};

// 意象关键词匹配
const IMAGERY_KEYWORDS: Record<string, string> = {
  "月": "🌙", "明月": "🌙", "月亮": "🌙", "玉兔": "🌙",
  "柳": "🌿", "杨柳": "🌿", "春风": "🌸",
  "花": "🌺", "桃花": "🌸", "荷花": "🪷", "莲": "🪷",
  "山": "⛰️", "峰": "⛰️", "岭": "⛰️",
  "水": "💧", "江": "🌊", "河": "🌊", "湖": "🌊", "海": "🌊",
  "云": "☁️", "云霞": "☁️",
  "雨": "🌧️", "雪": "❄️",
  "鸟": "🕊️", "雁": "🕊️", "鹤": "🦢",
  "酒": "🍶", "醉": "🍶",
  "剑": "⚔️",
  "琴": "🎵",
  "舟": "⛵", "帆": "⛵",
};

function extractImagery(text: string): string[] {
  const emojis: string[] = [];
  for (const [keyword, emoji] of Object.entries(IMAGERY_KEYWORDS)) {
    if (text.includes(keyword) && !emojis.includes(emoji)) {
      emojis.push(emoji);
    }
  }
  return emojis.slice(0, 4);
}

function highlightFamousLines(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const isFamous = Object.keys(FAMOUS_LINES).some((famous) =>
      line.includes(famous)
    );
    return (
      <span
        key={i}
        style={
          isFamous
            ? {
                color: "#8b4513",
                fontWeight: 600,
                borderBottom: "2px solid #c9a961",
                paddingBottom: 1,
              }
            : {}
        }
      >
        {line}
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

export function PoemCard({ poem }: { poem: PoemProps }) {
  const [expanded, setExpanded] = useState(false);
  const [imagery, setImagery] = useState<string[]>([]);

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded && imagery.length === 0) {
      setImagery(extractImagery(poem.content));
    }
  };

  return (
    <div className="poem-card" onClick={handleExpand}>
      {/* 标题 */}
      <div className="poem-header">
        <h3 className="poem-title">{poem.title}</h3>
        <span className="poem-author">
          {poem.author} · {poem.dynasty}
        </span>
      </div>

      {/* 正文 */}
      <div className="poem-content">{highlightFamousLines(poem.content)}</div>

      {/* 展开内容 */}
      {expanded && (
        <div className="poem-expanded">
          {/* 意象标签 */}
          {imagery.length > 0 && (
            <div className="imagery-tags">
              {imagery.map((emoji, i) => (
                <span key={i} className="imagery-tag">
                  {emoji}
                </span>
              ))}
            </div>
          )}

          {/* 吟诵指示 */}
          <div className="recite-hint">
            <span>点击文字聆听吟诵</span>
          </div>
        </div>
      )}

      {/* 展开指示 */}
      <div className="expand-hint">{expanded ? "收起 ▲" : "展开 ▼"}</div>
    </div>
  );
}

// 分享卡片
export function ShareCard({ poem }: { poem: PoemProps }) {
  return (
    <div className="share-card">
      <div className="share-bg" />
      <div className="share-content">
        <h3>{poem.title}</h3>
        <p className="share-author">
          {poem.author} · {poem.dynasty}
        </p>
        <div className="share-poem">{poem.content}</div>
        <div className="share-watermark">中国古诗词地图</div>
      </div>
    </div>
  );
}
