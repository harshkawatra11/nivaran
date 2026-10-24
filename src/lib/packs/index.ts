import type { Pack } from "@/lib/packs/types";
import { DELHI_PACK } from "@/lib/packs/in-dl";

const PACKS: Record<string, Pack> = { "in-dl": DELHI_PACK };

export function getPack(id: string): Pack {
  const pack = PACKS[id];
  if (!pack) throw new Error(`Unknown pack: ${id}`);
  return pack;
}
