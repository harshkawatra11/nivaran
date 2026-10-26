import type { ModelKey } from "@/lib/llm/models";
import { MODELS } from "@/lib/llm/models";

export function ModelChip({ model, ms, costUsd }: { model: ModelKey; ms?: number; costUsd?: number }) {
  const spec = MODELS[model];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-card px-2.5 py-1 font-mono text-xs text-ink-2">
      <span className="h-1.5 w-1.5 rounded-full bg-nv" />
      {spec.label}
      {ms != null && <span className="text-muted">&middot; {(ms / 1000).toFixed(1)}s</span>}
      {costUsd != null && <span className="text-muted">&middot; ${costUsd.toFixed(4)}</span>}
    </span>
  );
}

export function CodeChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-verdigris/40 bg-verdigris/10 px-2.5 py-1 font-mono text-xs text-verdigris">
      <span className="h-1.5 w-1.5 rounded-full bg-verdigris" />
      Code
    </span>
  );
}
