// The simulated clock. Every session can time-travel for the demo; all date arithmetic in
// session-scoped routes goes through effectiveNow(offsetDays), never new Date() directly.
export function effectiveNow(offsetDays: number, real: Date = new Date()): Date {
  const d = new Date(real);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function daysBetween(aIso: string, b: Date): number {
  return Math.floor((b.getTime() - new Date(aIso + "T00:00:00Z").getTime()) / 86400000);
}

export function isPast(dueIso: string, now: Date): boolean {
  return new Date(dueIso + "T23:59:59Z").getTime() < now.getTime();
}
