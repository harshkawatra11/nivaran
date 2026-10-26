const VARIANTS = {
  code: { label: "Decided by code", color: "text-verdigris" },
  ultra: { label: "Reviewed by Nemotron Ultra", color: "text-ink" },
  overdue: { label: "Overdue", color: "text-seal" },
  verified: { label: "Source verified", color: "text-verdigris" },
  pending: { label: "Source pending", color: "text-ochre" },
} as const;

export function Seal({ kind, label }: { kind: keyof typeof VARIANTS; label?: string }) {
  const v = VARIANTS[kind];
  return <span className={`seal ${v.color}`}>{label ?? v.label}</span>;
}
