'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useEffect, useRef, useState } from 'react';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { HeaderBar } from './HeaderBar';
import SpectrumVisualizer from './SpectrumVisualizer';
import MicOscilloscope from './MicOscilloscope';
import { MicrophoneButton } from './MicrophoneButton';

type Entry = { role: string; text: string; ts: number; turnId?: string };

export default function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  if (!agentId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm tracking-widest uppercase text-neutral-400">Layercode Voice Agent</span>
          </div>
        </div>
        <div className="rounded-md border border-red-900/50 bg-red-950/40 text-red-300 p-4">Error: NEXT_PUBLIC_LAYERCODE_AGENT_ID is not set.</div>
      </div>
    );
  }
  return <VoiceAgentInner agentId={agentId} />;
}

function VoiceAgentInner({ agentId }: { agentId: string }) {
  // Transcript and signal state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const userTurnIndex = useRef<Record<string, number>>({});
  const assistantTurnIndex = useRef<Record<string, number>>({});
  const notifyRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Prepare notification audio element
    const a = new Audio('/notify1.wav');
    a.preload = 'auto';
    a.volume = 0.8;
    notifyRef.current = a;
    return () => {
      if (notifyRef.current) {
        // best-effort cleanup
        notifyRef.current.pause();
        notifyRef.current.src = '';
        notifyRef.current = null;
      }
    };
  }, []);

  function playNotify() {
    const a = notifyRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  // Helper to upsert streaming text into entries
  function upsertStreamingEntry(params: { role: 'user' | 'assistant'; turnId?: string; text: string; replace?: boolean }) {
    const { role, turnId, text, replace } = params;
    if (!turnId) {
      // No turn id, just append as a standalone entry
      setEntries((prev) => [...prev, { role, text, ts: Date.now() }]);
      return;
    }

    const indexMap = role === 'user' ? userTurnIndex.current : assistantTurnIndex.current;
    const existingIndex = indexMap[turnId];
    if (existingIndex === undefined) {
      setEntries((prev) => {
        const nextIndex = prev.length;
        indexMap[turnId] = nextIndex;
        return [...prev, { role, text, ts: Date.now(), turnId }];
      });
    } else {
      setEntries((prev) => {
        const copy = prev.slice();
        const current = copy[existingIndex];
        copy[existingIndex] = {
          ...current,
          text: replace ? text : current.text + text
        };
        return copy;
      });
    }
  }

  const { userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    _websocketUrl: 'wss://api-staging.layercode.com/v1/agents/web/websocket',
    onMuteStateChange(isMuted) {
      setEntries((prev) => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onMessage: (data: any) => {
      const ts = Date.now();
      switch (data?.type) {
        case 'turn.start': {
          setTurn(data.role);
          if (data.role == 'assistant') {
            playNotify();
          }
          // Optional: log turn change as a data entry for visibility
          // setEntries((prev) => [...prev, { role: 'data', text: `TURN → ${data.role}`, ts }]);
          break;
        }
        case 'vad_events': {
          setUserSpeaking(data.event == 'vad_start');
          break;
        }
        case 'user.transcript.delta': {
          upsertStreamingEntry({ role: 'user', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        case 'response.text': {
          upsertStreamingEntry({ role: 'assistant', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        // default: {
        //   // Fallback: log unknown events as data entries for visibility
        //   if (data) {
        //     try {
        //       const summary = typeof data === 'string' ? data : JSON.stringify(data);
        //       setEntries((prev) => [...prev, { role: 'data', text: summary, ts }]);
        //     } catch {
        //       setEntries((prev) => [...prev, { role: 'data', text: '[unserializable event]', ts }]);
        //     }
        //   }
        //   break;
        // }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar agentId={agentId} status={status} turn={turn} userSpeaking={userSpeaking} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
        <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
          <MicOscilloscope label="User" paused={isMuted} />
          {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 8000 Hz • Mono</p> */}
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <MicrophoneButton
              isMuted={isMuted}
              userSpeaking={userSpeaking}
              onToggle={() => {
                if (isMuted) unmute();
                else mute();
              }}
            />
            <div className={`text-[11px] uppercase tracking-wider ${isMuted ? 'text-red-300' : 'text-neutral-400'}`}>{isMuted ? 'Muted' : 'Live'}</div>
          </div>
        </div>
        <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
          <SpectrumVisualizer label="Agent" amplitude={agentAudioAmplitude} />
          {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 16000 Hz • Mono</p> */}
        </div>
      </div>

      <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
        <TranscriptConsole entries={entries} />
      </div>

      <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
        <PromptPane />
      </div>
    </div>
  );
}
