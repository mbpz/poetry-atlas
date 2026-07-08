"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type SpeechState = "idle" | "playing" | "paused";

// 仅在浏览器环境执行
const isBrowser = typeof window !== "undefined" && "speechSynthesis" in window;

export function useSpeech() {
  const [state, setState] = useState<SpeechState>("idle");
  const [currentLine, setCurrentLine] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 获取中文语音
  const getChineseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!isBrowser) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => v.lang.startsWith("zh")) ||
      voices.find((v) => v.name.includes("Chinese")) ||
      voices[0] ||
      null
    );
  }, []);

  // 朗读文本（支持逐行回调）
  const speak = useCallback(
    (text: string, lineTexts: string[]) => {
      if (!isBrowser) return;
      // 取消当前朗读
      window.speechSynthesis.cancel();

      let lineIndex = 0;

      const speakNext = () => {
        if (lineIndex >= lineTexts.length) {
          setState("idle");
          setCurrentLine(-1);
          return;
        }

        const line = lineTexts[lineIndex].trim();
        if (!line) {
          lineIndex++;
          speakNext();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(line);
        utteranceRef.current = utterance;

        const voice = getChineseVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = "zh-CN";
        utterance.rate = 0.85; // 稍慢，更古典
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          setCurrentLine(lineIndex);
        };

        utterance.onend = () => {
          lineIndex++;
          speakNext();
        };

        utterance.onerror = () => {
          setState("idle");
          setCurrentLine(-1);
        };

        window.speechSynthesis.speak(utterance);
      };

      setState("playing");
      speakNext();
    },
    [getChineseVoice]
  );

  const pause = useCallback(() => {
    if (!isBrowser) return;
    window.speechSynthesis.pause();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    if (!isBrowser) return;
    window.speechSynthesis.resume();
    setState("playing");
  }, []);

  const stop = useCallback(() => {
    if (!isBrowser) return;
    window.speechSynthesis.cancel();
    setState("idle");
    setCurrentLine(-1);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (isBrowser) window.speechSynthesis.cancel();
    };
  }, []);

  return { state, currentLine, speak, pause, resume, stop };
}
