'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  amplitude: number; // 0..1
  label: string;
  accent?: string; // tailwind color hex or name
  bars?: number;
  fillParent?: boolean; // when true, fill parent height; otherwise use default height
};

// Center-aligned bars that grow up/down equally.
// Center bar is most reactive; edges least.
// Slight "follow" wave via small per-bar delay using amplitude history.
export default function SpectrumVisualizer({ amplitude, label, accent = '#9B62FF', bars = 48, fillParent = false }: Props) {
  const clampedAmp = Math.max(0, Math.min(1, amplitude));
  const ampRef = useRef(clampedAmp);
  useEffect(() => {
    ampRef.current = clampedAmp;
  }, [clampedAmp]);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: bars }, () => 0));
  const weights = useMemo(() => {
    const arr: number[] = [];
    const center = (bars - 1) / 2;
    for (let i = 0; i < bars; i++) {
      const d = Math.abs(i - center);
      const norm = center === 0 ? 0 : d / center; // 0 at center, 1 at edges
      // Raised-cosine envelope: 1 at center, ~0 at edges
      const base = Math.cos((norm * Math.PI) / 2) ** 2;
      // Keep a minimum responsiveness at edges
      const w = 0.2 + 0.8 * base;
      arr.push(w);
    }
    return arr;
  }, [bars]);

  const ampHistoryRef = useRef<number[]>(Array(64).fill(0));
  const raf = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      // Limit to ~30 FPS
      const now = performance.now();
      if (now - lastTimeRef.current < 33) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      lastTimeRef.current = now;

      // Push latest amplitude into history buffer
      const hist = ampHistoryRef.current;
      hist.push(ampRef.current);
      if (hist.length > 256) hist.shift();

      const center = (bars - 1) / 2;
      const maxDelay = 8; // frames of delay from center to edge
      const next: number[] = new Array(bars);
      for (let i = 0; i < bars; i++) {
        const d = Math.abs(i - center);
        const norm = center === 0 ? 0 : d / center; // 0..1
        const delay = Math.round(norm * maxDelay);
        const idx = Math.max(0, hist.length - 1 - delay);
        const ampDelayed = hist[idx] ?? ampRef.current;
        const target = Math.min(1, Math.max(0, ampDelayed * weights[i]));
        next[i] = target;
      }

      // Smooth towards targets (no jiggle)
      setLevels((prev) => prev.map((p, i) => p + (next[i] - p) * 0.22));
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [bars, weights]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
        <span className="tracking-wide">{label}</span>
      </div>
      <div className={`${fillParent ? 'h-full' : 'h-24'} w-full grid`} style={{ gridTemplateColumns: `repeat(${bars}, minmax(0, 1fr))`, gap: '2px' }}>
        {levels.map((h, i) => (
          <div key={i} className="relative bg-transparent">
            <div
              className="absolute w-full rounded-full"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                height: `${Math.round(h * 400)}%`,
                minHeight: 4,
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}88 50%, ${accent} 100%)`,
                boxShadow: `0 0 8px ${accent}33`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
