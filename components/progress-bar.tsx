export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
