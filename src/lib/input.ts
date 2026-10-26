export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function imageError(file: {
  type: string;
  size: number;
}): string | null {
  if (!["image/jpeg", "image/png"].includes(file.type))
    return "Please upload a JPG or PNG image.";
  if (file.size <= 0 || file.size > 1_500_000)
    return "Each image must be between 1 byte and 1.5 MB.";
  return null;
}
export function reportError({
  text,
  lat,
  lng,
}: {
  text: string;
  lat: number | null;
  lng: number | null;
}): string | null {
  if (!text.trim() || text.length > 6000)
    return "Describe the problem in 1–6,000 characters.";
  if ((lat === null) !== (lng === null))
    return "Both latitude and longitude are required.";
  if (
    lat !== null &&
    lng !== null &&
    (!Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180)
  )
    return "Invalid location coordinates.";
  return null;
}
export function ownsCase(
  sessionId: string | null,
  caseSessionId: string | null,
): boolean {
  return !!sessionId && sessionId === caseSessionId;
}
export function canFileStep(status: string, step: string): boolean {
  return (
    (
      {
        rti: "rti_ready",
        first_appeal: "appeal_ready",
        second_appeal: "second_appeal_ready",
      } as Record<string, string>
    )[step] === status
  );
}
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
