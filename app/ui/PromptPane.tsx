"use client";

import { useState } from 'react';
import config from '@/layercode.config.json';

export default function PromptPane() {
  const prompt: string = (config as any)?.prompt || '';
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800"
      >
        <span>{open ? '▼' : '▲'} Prompt</span>
      </button>
      {open && (
        <div className="p-4">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-neutral-300">{prompt}</pre>
          <div className="mt-4 text-xs text-neutral-500">Modify in `layercode.config.json`</div>
        </div>
      )}
    </div>
  );
}
