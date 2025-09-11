export function ConnectionStatusIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 sm:px-3 p-1 rounded-full border border-neutral-800 bg-neutral-950/50">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-500'}`} />
      <span className="text-xs text-neutral-300 hidden sm:block">
        {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'error' ? 'Error' : 'Disconnected'}
      </span>
    </div>
  );
}
