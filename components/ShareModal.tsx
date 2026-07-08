"use client";

import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";

type ShareModalProps = {
  poem: {
    id: string;
    title: string;
    author: string;
    dynasty: string;
    content: string;
  };
  onClose: () => void;
};

// 背景模板
const TEMPLATES = [
  { id: "classic", name: "古典书香", bg: "linear-gradient(135deg, #fdf8f0, #f5e6d0)", color: "#3a2f1a" },
  { id: "ink", name: "水墨山水", bg: "linear-gradient(135deg, #e8e8e8, #c8c8c8)", color: "#2a2a2a" },
  { id: "moon", name: "明月光", bg: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#f0e6d0" },
  { id: "pink", name: "桃花扇", bg: "linear-gradient(135deg, #fce4ec, #f8bbd9)", color: "#4a1a2a" },
];

export function ShareModal({ poem, onClose }: ShareModalProps) {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 生成图片
  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");

      // 下载图片
      const link = document.createElement("a");
      link.download = `${poem.title}-${poem.author}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [poem]);

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* 标题 */}
        <div className="share-header">
          <h3>生成诗词海报</h3>
          <button onClick={onClose} className="share-close">✕</button>
        </div>

        {/* 模板选择 */}
        <div className="template-list">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`template-btn ${template.id === t.id ? "active" : ""}`}
              style={{ background: t.bg, color: t.color }}
              onClick={() => setTemplate(t)}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* 海报预览 */}
        <div className="card-preview">
          <div
            ref={cardRef}
            className="share-card"
            style={{ background: template.bg, color: template.color }}
          >
            <div className="card-border" />
            <div className="card-body">
              <div className="card-title">{poem.title}</div>
              <div className="card-author">
                {poem.author} · {poem.dynasty}
              </div>
              <div className="card-content">{poem.content}</div>
              <div className="card-watermark">诗词地图</div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="share-actions">
          <button className="share-download" onClick={generateImage} disabled={generating}>
            {generating ? "生成中..." : "📥 下载海报"}
          </button>
        </div>
      </div>
    </div>
  );
}
