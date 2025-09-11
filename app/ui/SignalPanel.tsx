import SpectrumVisualizer from './SpectrumVisualizer';
import { MicrophoneButton } from './MicrophoneButton';
import { useMemo } from 'react';

type VadStatus = 'idle' | 'speech' | 'silence' | 'failed';

export function SignalPanel({
  userAudioAmplitude,
  agentAudioAmplitude,
  vadStatus,
  isMuted,
  onToggleMute,
}: {
  userAudioAmplitude: number;
  agentAudioAmplitude: number;
  vadStatus: VadStatus;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const userAccent = useMemo(() => '#9B62FF', []);
  const assistantAccent = useMemo(() => '#9B62FF', []);

  return (
    <div className="p-4 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">VAD</div>
        <div
          className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
            vadStatus === 'speech'
              ? 'border-emerald-700 text-emerald-300'
              : vadStatus === 'silence'
              ? 'border-neutral-700 text-gray-400'
              : vadStatus === 'failed'
              ? 'border-red-700 text-red-300'
              : 'border-neutral-800 text-gray-500'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              vadStatus === 'speech'
                ? 'bg-emerald-400'
                : vadStatus === 'silence'
                ? 'bg-gray-500'
                : vadStatus === 'failed'
                ? 'bg-red-500'
                : 'bg-gray-700'
            }`}
          />
          {vadStatus}
        </div>
      </div>

      <div>
        <SpectrumVisualizer label="User" amplitude={10 * userAudioAmplitude} accent={userAccent} />
        <ul className="mt-2 text-[11px] leading-5 text-neutral-400">
          {/* <li>16-bit PCM audio data</li>
          <li>8000 Hz sample rate</li>
          <li>Mono channel</li> */}
        </ul>
      </div>
      <div>
        <SpectrumVisualizer label="Agent" amplitude={10 * agentAudioAmplitude} accent={assistantAccent} />
        <ul className="mt-2 text-[11px] leading-5 text-neutral-400">
          {/* <li>16-bit PCM audio data</li>
          <li>16000 Hz sample rate</li>
          <li>Mono channel</li> */}
        </ul>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 blur-md rounded-full" style={{ boxShadow: '0 0 24px #9B62FF55' }} />
            <div className="relative flex flex-col items-center gap-3 rounded-xl border border-neutral-800/80 bg-neutral-950/50 px-6 py-4">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Microphone</span>
              <MicrophoneButton isMuted={isMuted} onToggle={onToggleMute} />
              <div className={`text-[11px] uppercase tracking-wider ${isMuted ? 'text-red-300' : 'text-neutral-400'}`}>{isMuted ? 'Muted' : 'Live'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


