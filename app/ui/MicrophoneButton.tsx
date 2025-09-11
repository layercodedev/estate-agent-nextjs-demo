'use client';

import { MicrophoneIcon } from './MicrophoneIcon';

export function MicrophoneButton({ isMuted, onToggle, userSpeaking }: { isMuted: boolean; onToggle: () => void; userSpeaking: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isMuted}
      aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      className={`w-25 h-25 rounded-full flex items-center justify-center border transition-colors select-none ${
        isMuted
          ? 'border-red-800 bg-red-950/40 text-red-300 hover:border-red-600'
          : userSpeaking
            ? 'border-emerald-700 text-emerald-300'
            : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-600'
      } `}
    >
      <div className="relative">
        <div className="flex items-center justify-center">
          <MicrophoneIcon />
        </div>
        {isMuted ? <span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-wider uppercase text-red-300"></span> : null}
      </div>
    </button>
  );
}
