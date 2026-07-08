"use client";

import { PLACE_TYPES } from "@/lib/supabase";

// 动态 SVG 图标 - 每个维度都有独特的动画 SVG
const MARKER_ICONS: Record<string, string> = {
  city: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-city" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a574"/><stop offset="1" stop-color="#8b6914"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-city)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <rect x="14" y="18" width="5" height="12" fill="#c9a961" rx="1"/>
    <rect x="21" y="14" width="5" height="16" fill="#d4a574" rx="1"/>
    <rect x="16" y="22" width="3" height="4" fill="#8b6914"/>
    <rect x="23" y="18" width="3" height="6" fill="#8b6914"/>
    <circle cx="20" cy="10" r="2" fill="#ffd700">
      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  tower: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-tower" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8d5b7"/><stop offset="1" stop-color="#a08050"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-tower)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <path d="M20 6 L26 12 L14 12 Z" fill="#c9a961"/>
    <path d="M20 12 L26 18 L14 18 Z" fill="#d4a574"/>
    <rect x="12" y="20" width="16" height="10" fill="#b8956a" rx="1"/>
    <rect x="16" y="22" width="3" height="4" fill="#8b6914"/>
    <rect x="21" y="22" width="3" height="4" fill="#8b6914"/>
    <circle cx="20" cy="10" r="1.5" fill="#ff6b6b">
      <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  mountain: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-mtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb9a8"/><stop offset="1" stop-color="#4a8070"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-mtn)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="3s" repeatCount="indefinite"/>
    </circle>
    <path d="M8 30 L16 12 L22 22 L28 8 L32 30 Z" fill="url(#g-mtn)" opacity="0.8"/>
    <path d="M16 12 L20 18 L22 22" stroke="white" stroke-width="1" opacity="0.5"/>
    <circle cx="28" cy="10" r="3" fill="white" opacity="0.6">
      <animate attributeName="cy" values="10;8;10" dur="4s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  lake: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74b9d4"/><stop offset="1" stop-color="#4a80a0"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-lake)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <ellipse cx="20" cy="22" rx="12" ry="6" fill="url(#g-lake)" opacity="0.7"/>
    <path d="M10 22 Q14 20 18 22 Q22 24 26 22 Q28 21 30 22" stroke="white" stroke-width="1" fill="none" opacity="0.6">
      <animate attributeName="d" values="M10 22 Q14 20 18 22 Q22 24 26 22 Q28 21 30 22;M10 22 Q14 24 18 22 Q22 20 26 22 Q28 23 30 22;M10 22 Q14 20 18 22 Q22 24 26 22 Q28 21 30 22" dur="3s" repeatCount="indefinite"/>
    </path>
  </svg>`,

  temple: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-temple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a574"/><stop offset="1" stop-color="#a08050"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-temple)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <rect x="14" y="20" width="12" height="10" fill="#c9a961" rx="1"/>
    <path d="M12 20 L20 14 L28 20 Z" fill="#b8956a"/>
    <rect x="17" y="24" width="6" height="6" fill="#8b6914" rx="1"/>
    <circle cx="20" cy="12" r="1.5" fill="#ffd700">
      <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  pass: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-pass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a08070"/><stop offset="1" stop-color="#605040"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-pass)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <rect x="8" y="16" width="6" height="14" fill="#8b7355" rx="1"/>
    <rect x="26" y="16" width="6" height="14" fill="#8b7355" rx="1"/>
    <rect x="10" y="12" width="20" height="6" fill="#a08070" rx="1"/>
    <circle cx="20" cy="10" r="2" fill="#ff4444">
      <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  river: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5dade2"/><stop offset="1" stop-color="#2874a6"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-river)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <path d="M12 14 Q16 18 20 14 Q24 10 28 14" stroke="url(#g-river)" stroke-width="3" fill="none" stroke-linecap="round">
      <animate attributeName="d" values="M12 14 Q16 18 20 14 Q24 10 28 14;M12 16 Q16 12 20 16 Q24 20 28 16;M12 14 Q16 18 20 14 Q24 10 28 14" dur="3s" repeatCount="indefinite"/>
    </path>
    <path d="M10 24 Q14 28 18 24 Q22 20 26 24" stroke="url(#g-river)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6">
      <animate attributeName="d" values="M10 24 Q14 28 18 24 Q22 20 26 24;M10 26 Q14 22 18 26 Q22 30 26 26;M10 24 Q14 28 18 24 Q22 20 26 24" dur="2.5s" repeatCount="indefinite"/>
    </path>
  </svg>`,

  bridge: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-bridge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b0a090"/><stop offset="1" stop-color="#706050"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-bridge)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <path d="M8 24 Q20 16 32 24" stroke="#8b7355" stroke-width="2" fill="none"/>
    <path d="M8 28 Q20 20 32 28" stroke="#a08070" stroke-width="2" fill="none"/>
    <rect x="10" y="22" width="2" height="8" fill="#8b7355"/>
    <rect x="28" y="22" width="2" height="8" fill="#8b7355"/>
  </svg>`,

  garden: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-garden" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb97c"/><stop offset="1" stop-color="#4a804a"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-garden)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="20" cy="14" r="6" fill="#5d8a5d" opacity="0.8"/>
    <circle cx="16" cy="16" r="4" fill="#7cb97c" opacity="0.7"/>
    <circle cx="24" cy="16" r="4" fill="#7cb97c" opacity="0.7"/>
    <rect x="18" y="20" width="4" height="8" fill="#8b6914"/>
    <circle cx="20" cy="20" r="2" fill="#ff6b9d">
      <animate attributeName="r" values="2;2.5;2" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  palace: `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g-palace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a574"/><stop offset="1" stop-color="#8b4513"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#g-palace)" opacity="0.2">
      <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/>
    </circle>
    <path d="M8 28 L20 12 L32 28" fill="url(#g-palace)"/>
    <rect x="10" y="28" width="20" height="4" fill="#8b4513"/>
    <rect x="14" y="20" width="3" height="4" fill="#654321"/>
    <rect x="18.5" y="22" width="3" height="6" fill="#654321"/>
    <rect x="23" y="20" width="3" height="4" fill="#654321"/>
    <circle cx="20" cy="10" r="2" fill="#ffd700">
      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,
};

export function getMarkerIcon(type: string): string {
  return MARKER_ICONS[type] || MARKER_ICONS.city;
}

export function getMarkerEmoji(type: string): string {
  return PLACE_TYPES[type]?.icon || "📍";
}
