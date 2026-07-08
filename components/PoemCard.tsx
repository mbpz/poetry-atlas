"use client";

import { useState, useRef, useMemo } from "react";
import { useSpeech } from "@/lib/useSpeech";

type PoemProps = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  annotation?: string | null;
  translation?: string | null;
  appreciation?: string | null;
};

// 名句高亮
const FAMOUS_LINES = [
  "落霞与孤鹜齐飞，秋水共长天一色",
  "大漠孤烟直，长河落日圆",
  "春江潮水连海平，海上明月共潮生",
  "会当凌绝顶，一览众山小",
  "天生我材必有用，千金散尽还复来",
  "举头望明月，低头思故乡",
  "海内存知己，天涯若比邻",
  "但愿人长久，千里共婵娟",
  "不识庐山真面目，只缘身在此山中",
  "欲穷千里路，更上一层楼",
  "独在异乡为异客，每逢佳节倍思亲",
  "路漫漫其修远兮，吾将上下而求索",
  "山重水复疑无路，柳暗花明又一村",
  "两情若是久长时，又岂在朝朝暮暮",
  "人生自古谁无死，留取丹心照汗青",
  "问君能有几多愁，恰似一江春水向东流",
  "春花秋月何时了，往事知多少",
  "明月松间照，清泉石上流",
  "采菊东篱下，悠然见南山",
  "孤舟蓑笠翁，独钓寒江雪",
  "逝者如斯夫，不舍昼夜",
  "大江东去，浪淘尽，千古风流人物",
];

// 意象映射
const IMAGERY: Record<string, string> = {
  "月": "月", "明月": "月", "月亮": "月", "玉兔": "月", "婵娟": "月",
  "柳": "柳", "杨柳": "柳", "春风": "春", "东风": "春",
  "花": "花", "桃花": "花", "荷花": "莲", "莲": "莲", "菊": "菊",
  "山": "山", "峰": "山", "岭": "山", "岳": "山",
  "水": "水", "江": "江", "河": "河", "湖": "湖", "海": "海", "溪": "溪",
  "云": "云", "霞": "霞", "雾": "雾",
  "雨": "雨", "雪": "雪", "霜": "霜",
  "鸟": "鸟", "雁": "雁", "鹤": "鹤", "鸦": "鸦", "莺": "莺",
  "酒": "酒", "醉": "醉",
  "琴": "琴", "弦": "弦",
  "舟": "舟", "帆": "帆", "船": "船",
  "梅": "梅", "兰": "兰", "竹": "竹",
  "松": "松", "柏": "柏",
  "乡愁": "愁", "离愁": "愁", "相思": "思",
};

function getImagery(text: string): string[] {
  const found: string[] = [];
  for (const [keyword, label] of Object.entries(IMAGERY)) {
    if (text.includes(keyword) && !found.includes(label)) {
      found.push(label);
    }
  }
  return found.slice(0, 5);
}

function isFamousLine(line: string): boolean {
  return FAMOUS_LINES.some((f) => line.includes(f));
}

export function PoemCard({ poem }: { poem: PoemProps }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [activeNote, setActiveNote] = useState<"annotation" | "translation" | "appreciation">("annotation");
  const contentRef = useRef<HTMLDivElement>(null);
  const { state, currentLine, speak, pause, resume, stop } = useSpeech();

  const imagery = useMemo(() => getImagery(poem.content), [poem.content]);
  const lines = poem.content.split("\n");

  // 吟诵控制
  const handleRecite = () => {
    if (state === "playing") {
      pause();
    } else if (state === "paused") {
      resume();
    } else {
      speak(poem.content, lines);
    }
  };

  return (
    <div className="poem-card">
      {/* 顶部金色边 */}
      <div className="poem-card-top" />

      {/* 标题 + 作者 */}
      <div className="poem-header">
        <h3 className="poem-title">{poem.title}</h3>
        <span className="poem-author">{poem.author}·{poem.dynasty}</span>
      </div>

      {/* 正文 - 仅展示，不触发任何操作 */}
      <div className="poem-body" ref={contentRef}>
        {lines.map((line, i) => (
          <span
            key={i}
            className={
              currentLine === i
                ? "poem-line reciting"
                : isFamousLine(line)
                ? "poem-line famous"
                : "poem-line"
            }
          >
            {line}
            {i < lines.length - 1 && "\n"}
          </span>
        ))}
      </div>

      {/* 展开区域 */}
      {expanded && (
        <div className="poem-expanded">
          {/* 意象标签（带文字说明） */}
          {imagery.length > 0 && (
            <div className="imagery-row">
              <span className="imagery-label">意象</span>
              <div className="imagery-tags">
                {imagery.map((label, i) => (
                  <span key={i} className="imagery-chip">{label}</span>
                ))}
              </div>
            </div>
          )}

          {/* 注释区域（有此诗词数据时展示） */}
          {(poem.annotation || poem.translation || poem.appreciation) && (
            <div className="poem-notes">
              <div className="notes-tabs">
                {poem.annotation && (
                  <button
                    className={`note-tab ${activeNote === "annotation" ? "active" : ""}`}
                    onClick={() => setActiveNote("annotation")}
                  >
                    注释
                  </button>
                )}
                {poem.translation && (
                  <button
                    className={`note-tab ${activeNote === "translation" ? "active" : ""}`}
                    onClick={() => setActiveNote("translation")}
                  >
                    译文
                  </button>
                )}
                {poem.appreciation && (
                  <button
                    className={`note-tab ${activeNote === "appreciation" ? "active" : ""}`}
                    onClick={() => setActiveNote("appreciation")}
                  >
                    赏析
                  </button>
                )}
              </div>
              <div className="note-content">
                {(activeNote === "annotation" && poem.annotation) ||
                  (activeNote === "translation" && poem.translation) ||
                  (activeNote === "appreciation" && poem.appreciation)}
              </div>
            </div>
          )}

          {/* 明确操作按钮 */}
          <div className="poem-actions">
            <button
              className={`action-btn ${state === "playing" ? "active" : ""}`}
              title={state === "playing" ? "暂停" : "吟诵"}
              onClick={handleRecite}
            >
              {state === "playing" ? "⏸️" : "🔊"} <span>{state === "playing" ? "暂停" : "吟诵"}</span>
            </button>
            {state !== "idle" && (
              <button className="action-btn" title="停止" onClick={stop}>
                ⏹️ <span>停止</span>
              </button>
            )}
            <button className="action-btn" title="生成分享卡片" onClick={() => alert("分享功能敬请期待")}>
              📤 <span>分享</span>
            </button>
            <button
              className={`action-btn ${liked ? "active" : ""}`}
              title="收藏"
              onClick={() => setLiked(!liked)}
            >
              {liked ? "❤️" : "🤍"} <span>{liked ? "已收藏" : "收藏"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 展开/收起按钮 */}
      <button
        className="expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "收起 ▲" : "展开 ▼"}
      </button>
    </div>
  );
}
