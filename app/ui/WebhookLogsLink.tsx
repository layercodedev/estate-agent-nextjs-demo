"use client";

interface WebhookLogsLinkProps {
  agentId: string;
}

export function WebhookLogsLink({ agentId }: WebhookLogsLinkProps) {
  const webhookLogsUrl = `https://dash.layercode.com/agents/${agentId}/webhook-logs`;

  return (
    <a
      href={webhookLogsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-neutral-300 hover:text-white underline underline-offset-4"
    >
      <span>View live webhook logs</span>
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
  );
}
