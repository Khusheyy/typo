"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "running" | "finished";

const COLORS = {
  bg: "#1a1a1a",
  active: "#E2B714",
  muted: "#646669",
  hover: "#D1D0C5",
  correct: "#D1D0C5",
  incorrect: "#CA4754",
  extra: "#7E2A33",
} as const;

const WORDS_200: string[] = [
  "the", "of", "to", "and", "a", "in", "is", "it", "you", "that", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i",
  "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said",
  "there", "use", "an", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these", "so",
  "some", "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more", "write", "go", "see", "number", "no", "way", "could", "people",
  "my", "than", "first", "water", "been", "call", "who", "oil", "its", "now", "find", "long", "down", "day", "did", "get", "come", "made", "may", "part",
  "over", "new", "sound", "take", "only", "little", "work", "know", "place", "year", "live", "me", "back", "give", "most", "very", "after", "thing", "our", "just",
  "name", "good", "sentence", "man", "think", "say", "great", "where", "help", "through", "much", "before", "line", "right", "too", "mean", "old", "any", "same", "tell",
  "boy", "follow", "came", "want", "show", "also", "around", "form", "three", "small", "set", "put", "end", "does", "another", "well", "large", "must", "big", "even",
  "such", "because", "turn", "here", "why", "ask", "went", "men", "read", "need", "land", "different", "home", "us", "move", "try", "kind", "hand", "picture", "again",
  "change", "off", "play", "spell", "air", "away", "animal", "house", "point", "page", "letter", "mother", "answer", "found", "study", "still", "learn", "should", "america", "world",
  "high", "every", "near", "add", "food", "between", "own", "below", "country", "plant", "last", "school", "father", "keep", "tree", "never", "start", "city", "earth", "eyes",
  "light", "thought", "head", "under", "story", "saw", "left", "don't", "few", "while", "along", "might", "close", "something", "seem", "next", "hard", "open", "example", "begin",
  "life", "always", "those", "both", "paper", "together", "got", "group", "often", "run", "important", "until", "children", "side", "feet", "car", "mile", "night", "walk", "white",
  "sea", "began", "grow", "took", "river", "four", "carry", "state", "once", "book", "hear", "stop", "without", "second", "later", "miss", "idea", "enough", "eat", "face",
  "watch", "far", "indian", "real", "almost", "let", "above", "girl", "sometimes", "mountain", "cut", "young", "talk", "soon", "list", "song", "being", "leave", "family", "it's",
  "body", "music", "color", "stand", "sun", "questions", "fish", "area", "mark", "dog", "horse", "birds", "problem", "complete", "room", "knew", "since", "ever", "piece", "told",
  "usually", "didn't", "friends", "easy", "heard", "order", "red", "door", "sure", "become", "top", "ship", "across", "today", "during", "short", "better", "best", "however", "low",
  "hours", "black", "products", "happened", "whole", "measure", "remember", "early", "waves", "reached", "listen", "wind", "rock", "space", "covered", "fast", "several", "hold", "himself", "toward",
];

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function makeWordList(count: number, punctuation: boolean, numbers: boolean) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = pickRandom(WORDS_200);
    if (numbers && Math.random() < 0.12) {
      w = `${w}${Math.floor(Math.random() * 100)}`;
    }
    if (punctuation && Math.random() < 0.18) {
      const p = pickRandom([",", ".", "!", "?", ":", ";"]);
      w = `${w}${p}`;
    }
    out.push(w);
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ── stats helpers ── */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const mx = (p.x + c.x) / 2;
    d += ` C ${mx} ${p.y} ${mx} ${c.y} ${c.x} ${c.y}`;
  }
  return d;
}

export function TypingTest({
  mode,
  selectedTime,
  selectedWords,
  onStatusChange,
}: {
  mode: "time" | "words";
  selectedTime: number;
  selectedWords: number;
  onStatusChange?: (status: Status) => void;
}) {
  const [words, setWords] = useState<string[]>([]);
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  const [timer, setTimer] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const wordsRef = useRef<string[]>(words);
  const typedWordsRef = useRef<string[]>(typedWords);
  const currentWordIndexRef = useRef<number>(currentWordIndex);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [scrollY, setScrollY] = useState(0);
  const [cursor, setCursor] = useState<{ left: number; top: number; height: number }>({
    left: 0, top: 0, height: 0,
  });

  /* ── tracking state (for results display) ── */
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [extraCharsCount, setExtraCharsCount] = useState(0);
  const [missedChars, setMissedChars] = useState(0);
  const [totalKeypresses, setTotalKeypresses] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [rawHistory, setRawHistory] = useState<number[]>([]);
  const [errorHistory, setErrorHistory] = useState<number[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);

  /* ── tracking refs (avoid stale closures) ── */
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const extraCharsRef = useRef(0);
  const missedCharsRef = useRef(0);
  const totalKeypressesRef = useRef(0);
  const errorsThisSecondRef = useRef(0);
  const lastRecordedSecondRef = useRef(0);

  const lineHeightPx = 64;
  const toolbarFont = "font-mono";

  // Generate words on client mount to avoid hydration mismatch
  useEffect(() => {
    const w = makeWordList(140, false, false);
    setWords(w);
    setTypedWords(Array(w.length).fill(""));
  }, []);

  const reset = () => {
    const nextWords = makeWordList(140, false, false);
    setWords(nextWords);
    setTypedWords(Array(nextWords.length).fill(""));
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setStatus("idle");
    setStartTime(null);
    setScrollY(0);
    setCursor({ left: 0, top: 0, height: 0 });
    setTimer(mode === "time" ? selectedTime : 0);

    setCorrectChars(0);
    setIncorrectChars(0);
    setExtraCharsCount(0);
    setMissedChars(0);
    setTotalKeypresses(0);
    setWpmHistory([]);
    setRawHistory([]);
    setErrorHistory([]);
    setTotalSeconds(0);
    setShowResults(false);
    setHoveredSecond(null);

    correctCharsRef.current = 0;
    incorrectCharsRef.current = 0;
    extraCharsRef.current = 0;
    missedCharsRef.current = 0;
    totalKeypressesRef.current = 0;
    errorsThisSecondRef.current = 0;
    lastRecordedSecondRef.current = 0;

    onStatusChange?.("idle");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => { reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode, selectedWords]);

  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { typedWordsRef.current = typedWords; }, [typedWords]);
  useEffect(() => { currentWordIndexRef.current = currentWordIndex; }, [currentWordIndex]);

  useEffect(() => { setTimer(mode === "time" ? selectedTime : 0); }, [mode, selectedTime]);

  /* ── countdown / count‑up timer ── */
  useEffect(() => {
    if (status !== "running") return;
    if (mode === "time" && selectedTime > 0) {
      const id = window.setInterval(() => {
        setTimer((t) => {
          const next = t - 1;
          if (next <= 0) { window.clearInterval(id); setStatus("finished"); return 0; }
          return next;
        });
      }, 1000);
      return () => window.clearInterval(id);
    }
    const id = window.setInterval(() => {
      if (!startTime) return;
      setTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [mode, selectedTime, startTime, status]);

  /* ── 1‑second history recording ── */
  useEffect(() => {
    if (status !== "running" || !startTime) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed < 1 || elapsed <= lastRecordedSecondRef.current) return;
      lastRecordedSecondRef.current = elapsed;
      const w = Math.round((correctCharsRef.current / 5) / (elapsed / 60));
      const r = Math.round((totalKeypressesRef.current / 5) / (elapsed / 60));
      const e = errorsThisSecondRef.current;
      errorsThisSecondRef.current = 0;
      setWpmHistory((h) => [...h, w]);
      setRawHistory((h) => [...h, r]);
      setErrorHistory((h) => [...h, e]);
    }, 200);
    return () => clearInterval(id);
  }, [status, startTime]);

  /* ── notify parent ── */
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  /* ── finish handler ── */
  useEffect(() => {
    if (status !== "finished") return;
    const secs = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    setTotalSeconds(secs);
    if (mode === "time") {
      const w = wordsRef.current[currentWordIndexRef.current];
      const t = typedWordsRef.current[currentWordIndexRef.current] ?? "";
      if (w && t.length < w.length) missedCharsRef.current += w.length - t.length;
    }
    setCorrectChars(correctCharsRef.current);
    setIncorrectChars(incorrectCharsRef.current);
    setExtraCharsCount(extraCharsRef.current);
    setMissedChars(missedCharsRef.current);
    setTotalKeypresses(totalKeypressesRef.current);
    const tid = setTimeout(() => setShowResults(true), 80);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => { inputRef.current?.focus(); });

  /* ── cursor + scroll ── */
  useEffect(() => {
    const currentWordEl = wordRefs.current[currentWordIndex];
    if (!currentWordEl) return;
    const container = currentWordEl.offsetParent as HTMLElement | null;
    if (!container) return;
    const wordTop = currentWordEl.offsetTop;
    if (wordTop - scrollY >= 2 * lineHeightPx) setScrollY((y) => y + lineHeightPx);
    const idx = clamp(currentCharIndex, 0, 9999);
    const charEl = charRefs.current[idx] || null;
    const wordRect = currentWordEl.getBoundingClientRect();
    if (charEl) {
      const r = charEl.getBoundingClientRect();
      setCursor({ left: r.left - wordRect.left + currentWordEl.offsetLeft, top: currentWordEl.offsetTop, height: r.height });
    } else {
      const lastChar = currentWordEl.querySelector("[data-char='last']") as HTMLElement | null;
      if (lastChar) {
        const r = lastChar.getBoundingClientRect();
        setCursor({ left: r.right - wordRect.left + currentWordEl.offsetLeft, top: currentWordEl.offsetTop, height: r.height });
      } else {
        setCursor({ left: currentWordEl.offsetLeft, top: currentWordEl.offsetTop, height: lineHeightPx });
      }
    }
  }, [currentCharIndex, currentWordIndex, scrollY]);

  const startIfNeeded = () => {
    setStatus((prev) => {
      if (prev !== "idle") return prev;
      const now = Date.now();
      setStartTime(now);
      setTimer(mode === "time" ? selectedTime : 0);
      return "running";
    });
  };

  const applyChar = (ch: string) => {
    startIfNeeded();
    if (status === "finished") return;
    const word = words[currentWordIndex];
    if (currentCharIndex >= word.length) {
      extraCharsRef.current += 1;
    } else if (ch === word[currentCharIndex]) {
      correctCharsRef.current += 1;
    } else {
      incorrectCharsRef.current += 1;
      errorsThisSecondRef.current += 1;
    }
    setTypedWords((prev) => {
      const copy = prev.slice();
      copy[currentWordIndex] = (copy[currentWordIndex] ?? "") + ch;
      return copy;
    });
    setCurrentCharIndex((i) => i + 1);
  };

  const backspace = () => {
    if (status === "finished") return;
    const curTyped = typedWords[currentWordIndex] ?? "";
    if (curTyped.length > 0) {
      setTypedWords((prev) => {
        const copy = prev.slice();
        copy[currentWordIndex] = (copy[currentWordIndex] ?? "").slice(0, -1);
        return copy;
      });
      setCurrentCharIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (currentWordIndex > 0) {
      const prevIndex = currentWordIndex - 1;
      const prevTyped = typedWords[prevIndex] ?? "";
      setCurrentWordIndex(prevIndex);
      setCurrentCharIndex(prevTyped.length);
    }
  };

  const nextWord = () => {
    startIfNeeded();
    if (status === "finished") return;
    const word = words[currentWordIndex];
    const typed = typedWords[currentWordIndex] ?? "";
    if (typed.length < word.length) missedCharsRef.current += word.length - typed.length;
    const nextIndex = currentWordIndex + 1;
    if (mode === "words" && nextIndex >= selectedWords) { setStatus("finished"); return; }
    setCurrentWordIndex(nextIndex);
    setCurrentCharIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") { e.preventDefault(); reset(); return; }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reset(); return; }
    if (status === "finished") { e.preventDefault(); return; }
    if (e.key === "Backspace" || e.key === " " || e.key.length === 1) totalKeypressesRef.current += 1;
    if (e.key === "Backspace") { e.preventDefault(); backspace(); return; }
    if (e.key === " ") { e.preventDefault(); nextWord(); return; }
    if (e.key.length !== 1) return;
    applyChar(e.key);
  };

  /* ═══════════════════════════════════════════════
     RESULTS SCREEN
     ═══════════════════════════════════════════════ */
  if (words.length === 0) return null;

  if (status === "finished") {
    const finalWpm = totalSeconds > 0 ? Math.round((correctChars / 5) / (totalSeconds / 60)) : 0;
    const rawWpm = totalSeconds > 0 ? Math.round((totalKeypresses / 5) / (totalSeconds / 60)) : 0;
    const accuracy = correctChars + incorrectChars > 0
      ? Math.round((correctChars / (correctChars + incorrectChars)) * 100) : 100;
    const consistency = wpmHistory.length > 1
      ? Math.round(Math.max(0, Math.min(100, 100 - (stdDev(wpmHistory) / mean(wpmHistory) * 100)))) : 100;

    const chartW = 900, chartH = 288;
    const pad = { top: 20, right: 60, bottom: 35, left: 60 };
    const plotW = chartW - pad.left - pad.right;
    const plotH = chartH - pad.top - pad.bottom;
    const allVals = [...wpmHistory, ...rawHistory];
    const yMax = Math.max(Math.ceil(Math.max(...allVals, 1) / 20) * 20, 20);
    const maxErr = Math.max(...errorHistory, 1);
    const n = wpmHistory.length;
    const xS = (i: number) => pad.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
    const yS = (v: number) => pad.top + plotH - (v / yMax) * plotH;
    const wpmPts = wpmHistory.map((v, i) => ({ x: xS(i), y: yS(v) }));
    const rawPts = rawHistory.map((v, i) => ({ x: xS(i), y: yS(v) }));
    const avgY = yS(mean(wpmHistory));
    const gridCount = 5;
    const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => ({
      y: yS(Math.round((yMax / gridCount) * i)), label: Math.round((yMax / gridCount) * i),
    }));

    return (
      <div className={`min-h-screen bg-[#1a1a1a] flex flex-col justify-center px-16 py-12 font-mono transition-opacity duration-500 ${showResults ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-stretch">
          {/* Left stats panel */}
          <div className="w-48 flex-shrink-0 flex flex-col justify-between pr-8">
            <div>
              <div className="text-sm text-gray-500 font-mono">wpm</div>
              <div className="text-8xl font-bold text-[#E2B714] leading-none">{finalWpm}</div>
              <div className="text-sm text-gray-500 font-mono mt-4">acc</div>
              <div className="text-6xl font-bold text-[#E2B714] leading-none">{accuracy}%</div>
            </div>
            <div className="mt-6">
              <div className="text-xs text-gray-500">test type</div>
              <div className="text-sm text-[#E2B714]">{mode} {mode === "time" ? selectedTime : selectedWords}</div>
              <div className="text-sm text-[#E2B714]">english</div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-72"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * chartW;
                const rel = x - pad.left;
                if (rel < 0 || rel > plotW || n === 0) { setHoveredSecond(null); return; }
                setHoveredSecond(Math.max(0, Math.min(n - 1, Math.round((rel / plotW) * (n - 1)))));
              }}
              onMouseLeave={() => setHoveredSecond(null)}
            >
              {gridLines.map((g, i) => (
                <g key={i}>
                  <line x1={pad.left} y1={g.y} x2={chartW - pad.right} y2={g.y} stroke="rgba(255,255,255,0.06)" />
                  <text x={pad.left - 8} y={g.y + 3} textAnchor="end" fontSize={10} fill="#666">{g.label}</text>
                </g>
              ))}
              {Array.from({ length: Math.min(maxErr, 4) + 1 }, (_, i) => (
                <text key={`el-${i}`} x={chartW - pad.right + 8} y={yS((yMax * i) / Math.min(maxErr, 4)) + 3} textAnchor="start" fontSize={10} fill="#666">{Math.round((maxErr * i) / Math.min(maxErr, 4))}</text>
              ))}
              <text x={12} y={chartH / 2} textAnchor="middle" fontSize={10} fill="#666" transform={`rotate(-90, 12, ${chartH / 2})`}>Words per Minute</text>
              <text x={chartW - 12} y={chartH / 2} textAnchor="middle" fontSize={10} fill="#666" transform={`rotate(90, ${chartW - 12}, ${chartH / 2})`}>Errors</text>
              {wpmHistory.map((_, i) => {
                const step = n > 30 ? 5 : n > 15 ? 2 : 1;
                if (i % step !== 0 && i !== n - 1) return null;
                return <text key={i} x={xS(i)} y={chartH - 5} textAnchor="middle" fontSize={10} fill="#666">{i + 1}</text>;
              })}
              {n > 0 && <line x1={pad.left} y1={avgY} x2={chartW - pad.right} y2={avgY} stroke="#E2B714" strokeWidth={1} strokeDasharray="6,4" opacity={0.5} />}
              {rawPts.length > 1 && <path d={smoothPath(rawPts)} fill="none" stroke="#646669" strokeWidth={2} />}
              {wpmPts.length > 1 && <path d={smoothPath(wpmPts)} fill="none" stroke="#E2B714" strokeWidth={2} />}
              {rawPts.map((p, i) => <circle key={`r${i}`} cx={p.x} cy={p.y} r={3} fill="#646669" />)}
              {wpmPts.map((p, i) => <circle key={`w${i}`} cx={p.x} cy={p.y} r={3} fill="#E2B714" />)}
              {errorHistory.map((er, i) => er > 0 ? <text key={`e${i}`} x={xS(i)} y={pad.top + plotH - 5} textAnchor="middle" fontSize={12} fill="#CA4754" fontWeight="bold">×</text> : null)}
              {hoveredSecond !== null && (
                <g>
                  <line x1={xS(hoveredSecond)} y1={pad.top} x2={xS(hoveredSecond)} y2={pad.top + plotH} stroke="rgba(255,255,255,0.3)" strokeDasharray="4,4" />
                  <rect x={xS(hoveredSecond) - 55} y={pad.top - 5} width={110} height={48} rx={4} fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.1)" />
                  <text x={xS(hoveredSecond)} y={pad.top + 10} textAnchor="middle" fontSize={10} fill="#999">{hoveredSecond + 1}s</text>
                  <text x={xS(hoveredSecond)} y={pad.top + 23} textAnchor="middle" fontSize={10} fill="#E2B714">wpm: {wpmHistory[hoveredSecond]}</text>
                  <text x={xS(hoveredSecond)} y={pad.top + 36} textAnchor="middle" fontSize={10} fill="#646669">raw: {rawHistory[hoveredSecond]}</text>
                </g>
              )}
            </svg>
          </div>
        </div>


        {/* Restart */}
        <div className="mt-8 flex justify-center">
          <button onClick={reset} className="text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-2 text-xs font-mono tracking-widest uppercase cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            restart
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     TYPING TEST (unchanged rendering)
     ═══════════════════════════════════════════════ */
  return (
    <section
      className={[
        "w-full max-w-4xl mx-auto",
        toolbarFont,
        "text-[var(--mt-muted)]",
      ].join(" ")}
      style={
        {
          ["--mt-bg" as string]: COLORS.bg,
          ["--mt-active" as string]: COLORS.active,
          ["--mt-muted" as string]: COLORS.muted,
          ["--mt-hover" as string]: COLORS.hover,
        } as React.CSSProperties
      }
    >
      <div className="px-4 mt-10">
        <>
          {status === "running" || (mode === "time" && timer !== selectedTime) ? (
            <div className="text-[#E2B714] text-2xl font-mono leading-none mb-6">{timer}</div>
          ) : (
            <div className="h-8 mb-6" />
          )}

          <div className="relative">
            <div className="relative overflow-hidden" style={{ height: '12rem' }}>
              <div className="transition-transform duration-300 ease-out will-change-transform" style={{ transform: `translateY(${-scrollY}px)` }}>
                <div className="text-3xl leading-[4rem] tracking-wide select-none" style={{ color: COLORS.muted }}>
                  {words.map((w, wi) => {
                    const typed = typedWords[wi] ?? "";
                    const isCurrent = wi === currentWordIndex;
                    return (
                      <span
                        key={`${w}-${wi}`}
                        ref={(el) => { wordRefs.current[wi] = el; }}
                        className={[
                          "inline-block mr-3 relative",
                          isCurrent ? "after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-white/10" : "",
                        ].join(" ")}
                      >
                        {w.split("").map((ch, ci) => {
                          const t = typed[ci];
                          const isCorrect = t === ch;
                          const isIncorrect = t != null && t !== ch;
                          const color = isCorrect ? COLORS.correct : isIncorrect ? COLORS.incorrect : COLORS.muted;
                          const shouldRef = isCurrent && ci === currentCharIndex;
                          return (
                            <span
                              key={`${wi}-${ci}`}
                              ref={(el) => { if (shouldRef) charRefs.current[currentCharIndex] = el; }}
                              className="relative"
                              style={{ color }}
                            >
                              {ch}
                              {ci === w.length - 1 ? <span data-char="last" className="sr-only">.</span> : null}
                            </span>
                          );
                        })}
                        {typed.length > w.length
                          ? typed.slice(w.length).split("").map((ch, i) => (
                            <span key={`x-${wi}-${i}`} style={{ color: COLORS.extra }}>{ch}</span>
                          ))
                          : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* cursor */}
            <div
              className="absolute w-[2px] h-[2.2rem] bg-[var(--mt-active)] animate-[blink_1s_step-end_infinite]"
              style={{
                left: cursor.left,
                top: cursor.top - scrollY + 14,
              }}
            />
          </div>

          <input
            ref={inputRef}
            value=""
            onChange={() => { }}
            onKeyDown={handleKeyDown}
            className="absolute opacity-0 pointer-events-none"
            aria-hidden="true"
          />
        </>
      </div>
    </section>
  );
}

export default TypingTest;
