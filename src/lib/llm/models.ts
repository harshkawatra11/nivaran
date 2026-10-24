// Model tier ledger. Every call site picks one of these five keys; the actual model id and
// price come from here so the rest of the codebase never hardcodes a string. IDs are
// env-overridable (NV_MODEL_*) so a spike-time catalog change doesn't need a code change.
export type ModelKey = "lightning" | "nano" | "super" | "superVL" | "ultra";

export interface ModelSpec {
  key: ModelKey;
  id: string;
  label: string;
  role: string;
  inPer1M: number;
  cachedPer1M: number;
  outPer1M: number;
}

export const MODELS: Record<ModelKey, ModelSpec> = {
  lightning: {
    key: "lightning",
    id: process.env.NV_MODEL_LIGHTNING ?? "nvidia/Nemotron-3_5-Lightning",
    label: "Nemotron 3.5 Lightning",
    role: "Fast intake, extraction, and the real-time voice agent",
    inPer1M: 0.06,
    cachedPer1M: 0.06,
    outPer1M: 0.24,
  },
  nano: {
    key: "nano",
    id: process.env.NV_MODEL_NANO ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    label: "Nemotron 3 Nano",
    role: "Bulk status digests in the nightly job",
    inPer1M: 0.06,
    cachedPer1M: 0.06,
    outPer1M: 0.24,
  },
  super: {
    key: "super",
    id: process.env.NV_MODEL_SUPER ?? "nvidia/nemotron-3-super-120b-a12b",
    label: "Nemotron 3 Super",
    role: "Research agent and drafting",
    inPer1M: 0.3,
    cachedPer1M: 0.06,
    outPer1M: 0.9,
  },
  superVL: {
    key: "superVL",
    id: process.env.NV_MODEL_SUPER_VL ?? "nvidia/Nemotron-3.5-Super-VL",
    label: "Nemotron 3.5 Super VL",
    role: "Reads photos, acknowledgement slips, and reply letters",
    inPer1M: 0.3,
    cachedPer1M: 0.06,
    outPer1M: 0.9,
  },
  ultra: {
    key: "ultra",
    id: process.env.NV_MODEL_ULTRA ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
    label: "Nemotron 3 Ultra",
    role: "Adversarial review and judgment",
    inPer1M: 1.0,
    cachedPer1M: 0.12,
    outPer1M: 3.0,
  },
};

export function costUsd(key: ModelKey, prompt = 0, completion = 0, cached = 0): number {
  const m = MODELS[key];
  return ((prompt - cached) * m.inPer1M + cached * m.cachedPer1M + completion * m.outPer1M) / 1_000_000;
}
