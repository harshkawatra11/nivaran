export interface ClusterRow {
  id: string;
  category: string;
  geohash6: string;
  locality: string | null;
  status: string;
  case_count: number;
  overdue_count: number;
  first_seen: string;
  last_seen: string;
  brief: import("@/lib/schemas").ClusterBrief | null;
}
export interface BoardData {
  scorecards: {
    authorityId: string;
    name: string;
    open: number;
    overdue: number;
    medianDaysOpen: number;
  }[];
  clusters: ClusterRow[];
}
export function hashCenter(hash: string): [number, number] {
  const base = "0123456789bcdefghjkmnpqrstuvwxyz";
  const lat = [-90, 90],
    lng = [-180, 180];
  let even = true;
  for (const ch of hash) {
    const n = base.indexOf(ch);
    if (n < 0) return [28.61, 77.21];
    for (let bit = 4; bit >= 0; bit--) {
      const range = even ? lng : lat;
      const mid = (range[0] + range[1]) / 2;
      if (n & (1 << bit)) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return [(lat[0] + lat[1]) / 2, (lng[0] + lng[1]) / 2];
}
