'use client';

import { useState } from 'react';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { WebhookLogsLink } from './WebhookLogsLink';

type TurnState = 'idle' | 'user' | 'assistant';

export function HeaderBar({ agentId, status, turn }: { agentId: string; status: string; turn: TurnState }) {
  const [copied, setCopied] = useState(false);
  function copyAgentId() {
    if (navigator?.clipboard) {
      navigator.clipboard
        .writeText(agentId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {});
    }
  }

  return (
    <header className="flex items-center justify-between mb-4 text-sm relative">
      <div className="flex items-center gap-3">
        <ConnectionStatusIndicator status={status} />
        <div className="relative hidden md:block">
          <button
            onClick={copyAgentId}
            className="px-2 py-1 rounded border border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
            title="Copy agent id"
          >
            <span className="inline-flex items-center gap-1">
              <span>agent id: {agentId}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </span>
          </button>
          {copied && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-200 shadow">
              copied to clipboard
            </div>
          )}
        </div>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider text-neutral-400">Turn:</span>
          <span
            className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
              turn === 'assistant' ? 'border-cyan-700 text-cyan-300' : turn === 'user' ? 'border-emerald-700 text-emerald-300' : 'border-neutral-700 text-gray-400'
            }`}
          >
            {turn}
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <WebhookLogsLink agentId={agentId} />
        <a
          href="https://docs.layercode.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-neutral-300 hover:text-white underline underline-offset-4"
        >
          <span>Docs</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
          </svg>
        </a>
      </div>
    </header>
  );
}
