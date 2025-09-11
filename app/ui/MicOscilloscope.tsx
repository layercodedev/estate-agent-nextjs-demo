'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  label?: string;
  accent?: string; // hex or css color
  paused?: boolean; // when true, suspend context and pause drawing
  heightPx?: number; // canvas height in pixels (CSS px)
};

// Mic-driven oscilloscope (time-domain line) using Web Audio API
export default function MicOscilloscope({ label = 'Microphone', accent = '#9B62FF', paused = false, heightPx = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Setup audio graph once on mount
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        if (cancelled) {
          // If we unmounted while awaiting permission, stop tracks immediately
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        // Heavier smoothing for calmer motion
        analyser.smoothingTimeConstant = 0.95;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        // Gentle low-pass filter to reduce high-frequency jitter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Allow more articulation while still smoothing harsh highs
        filter.frequency.value = 900; // Hz
        filter.Q.value = 0.707;
        filterRef.current = filter;
        source.connect(filter);
        filter.connect(analyser);

        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        // Start in running state unless paused is true
        if (paused) {
          try {
            await ctx.suspend();
          } catch {}
        } else {
          try {
            await ctx.resume();
          } catch {}
        }

        draw();
      } catch (e: any) {
        setError(e?.message || 'Microphone access failed');
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        analyserRef.current?.disconnect();
      } catch {}
      try {
        sourceRef.current?.disconnect();
      } catch {}
      try {
        filterRef.current?.disconnect();
      } catch {}
      try {
        audioCtxRef.current?.close();
      } catch {}
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      analyserRef.current = null;
      sourceRef.current = null;
      filterRef.current = null;
      streamRef.current = null;
      audioCtxRef.current = null;
      dataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pause/resume via AudioContext state
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const doToggle = async () => {
      try {
        if (paused) await ctx.suspend();
        else await ctx.resume();
      } catch {}
    };
    doToggle();
  }, [paused]);

  // Draw oscilloscope to canvas
  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!canvas || !analyser || !data) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 320;
    const cssHeight = heightPx;
    if (canvas.width !== Math.floor(cssWidth * dpr) || canvas.height !== Math.floor(cssHeight * dpr)) {
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const W = cssWidth;
    const H = cssHeight;

    const render = () => {
      // Limit to ~20 FPS for calmer motion
      const now = performance.now();
      if (now - lastTimeRef.current < 20) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      lastTimeRef.current = now;
      // clear
      ctx2d.clearRect(0, 0, W, H);

      // background subtle grid line
      ctx2d.globalAlpha = 0.25;
      ctx2d.strokeStyle = '#2a2a2a';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, Math.floor(H / 2) + 0.5);
      ctx2d.lineTo(W, Math.floor(H / 2) + 0.5);
      ctx2d.stroke();
      ctx2d.globalAlpha = 1;

      // Get time-domain data for oscilloscope
      analyser.getByteTimeDomainData(data as unknown as Uint8Array);

      // Build path
      ctx2d.lineWidth = 1.5;
      const grad = ctx2d.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(0.5, accent);
      grad.addColorStop(1, accent);
      ctx2d.strokeStyle = grad;

      ctx2d.beginPath();
      // Downsample to smooth motion but keep more detail
      const step = 2; // take every 2nd sample
      const visiblePoints = Math.floor(data.length / step);
      let sliceWidth = W / visiblePoints;
      let x = 0;
      for (let i = 0; i < data.length; i += step) {
        const v = (data[i] as number) / 128.0 - 1.0; // -1..1
        const y = H / 2 + v * (H * 0.5); // increase vertical range
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
        x += sliceWidth;
      }
      ctx2d.stroke();

      // Glow
      ctx2d.save();
      ctx2d.shadowColor = accent + '44';
      ctx2d.shadowBlur = 4;
      ctx2d.stroke();
      ctx2d.restore();

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
        <span className="tracking-wide">{label}</span>
        {error && <span className="text-red-400">{error}</span>}
      </div>
      <div className="h-24 w-full rounded-md overflow-hidden relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
