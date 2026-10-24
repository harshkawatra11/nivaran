import { z } from "zod";

export const CATEGORIES = [
  "water_supply",
  "sewer_drainage",
  "garbage_sanitation",
  "road_pothole",
  "streetlight",
  "health_facility",
  "ration_pds",
  "pension_welfare",
  "electricity",
  "central_service",
  "other",
] as const;

export const HAZARDS = [
  "none",
  "live_wire",
  "fire",
  "building_collapse",
  "violence",
  "medical_emergency",
  "gas_leak",
  "drowning_risk",
  "no_drinking_water_days",
  "disease_outbreak",
  "medicine_unavailable_critical",
  "traffic_danger",
  "sewage_overflow",
  "mosquito_breeding",
] as const;

export const EvidenceFindings = z.object({
  issueSeen: z.string().describe("One sentence: what the photo shows, factually"),
  categoryGuess: z.enum(CATEGORIES),
  severity: z.number().int().min(1).max(5),
  details: z.array(z.string()).max(6).describe("Concrete visible details useful to an inspector"),
  visibleText: z.array(z.string()).max(8).describe("Any legible signboards, numbers, ward names"),
  hazards: z.array(z.enum(HAZARDS)).max(4),
  confidence: z.number().min(0).max(1),
  photoQualityIssue: z.string().nullable(),
});
export type EvidenceFindings = z.infer<typeof EvidenceFindings>;

export const GrievanceFacts = z.object({
  category: z.enum(CATEGORIES),
  summary: z.string().max(300),
  locationText: z.string(),
  locality: z.string().nullable(),
  sinceText: z.string().nullable().describe("How long the problem has existed, as stated"),
  sinceDays: z.number().int().nullable(),
  affectedEstimate: z.string().nullable(),
  priorComplaints: z.array(z.object({ channel: z.string(), ref: z.string().nullable(), date: z.string().nullable() })).max(5),
  hazards: z.array(z.enum(HAZARDS)).max(4),
  roadWidthHint: z.enum(["wide", "narrow", "unknown", "not_applicable"]),
  facilityOperatorHint: z.enum(["delhi_govt", "mcd", "unknown", "not_applicable"]),
  language: z.enum(["en", "hi", "mixed"]),
  citizenAsk: z.string().describe("What the citizen wants done, in one line"),
});
export type GrievanceFacts = z.infer<typeof GrievanceFacts>;

export const Citation = z.object({ url: z.string(), title: z.string(), supports: z.string() });
export const ResearchNotes = z.object({
  channelConfirmed: z.object({
    name: z.string(),
    url: z.string().nullable(),
    helpline: z.string().nullable(),
    status: z.enum(["confirmed", "differs", "not_found"]),
    note: z.string(),
  }),
  officerDesignation: z.string().nullable(),
  relevantNotices: z.array(z.object({ title: z.string(), url: z.string(), date: z.string().nullable(), relevance: z.string() })).max(4),
  newsCorroboration: z.array(z.object({ title: z.string(), url: z.string(), date: z.string().nullable() })).max(3),
  citations: z.array(Citation).max(10),
});
export type ResearchNotes = z.infer<typeof ResearchNotes>;

export const DraftOut = z.object({
  subject: z.string().max(140),
  factsParagraph: z.string().max(1600),
  requestedActions: z.array(z.string()).min(1).max(4),
});
export type DraftOut = z.infer<typeof DraftOut>;

export const BenchReview = z.object({
  verdict: z.enum(["pass", "revise"]),
  rejectionRisks: z.array(z.object({ issue: z.string(), severity: z.enum(["high", "medium", "low"]), fix: z.string() })).max(6),
  missingEvidence: z.array(z.string()).max(4),
  strengths: z.array(z.string()).max(3),
  officerReading: z.string().describe("One or two sentences: how the receiving officer will likely read this"),
});
export type BenchReview = z.infer<typeof BenchReview>;

export const AckRead = z.object({
  isAcknowledgement: z.boolean(),
  registrationNumber: z.string().nullable(),
  filedDate: z.string().nullable().describe("YYYY-MM-DD"),
  authorityName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type AckRead = z.infer<typeof AckRead>;

export const ReplyRead = z.object({
  isOfficialReply: z.boolean(),
  fromAuthority: z.string().nullable(),
  replyDate: z.string().nullable(),
  fullText: z.string().max(6000),
});
export type ReplyRead = z.infer<typeof ReplyRead>;

export const ReplyJudgment = z.object({
  outcome: z.enum(["resolved", "partial", "evasive", "rejected", "transferred"]),
  reasons: z.array(z.string()).max(4),
  unansweredPoints: z.array(z.string()).max(6),
  appealGrounds: z.array(z.string()).max(4),
  citizenSummary: z.string().max(400),
});
export type ReplyJudgment = z.infer<typeof ReplyJudgment>;

export const ClusterBrief = z.object({
  headline: z.string().max(120),
  pattern: z.string().max(900),
  timeline: z.array(z.object({ date: z.string(), event: z.string() })).max(12),
  deadlinesMissed: z.number().int(),
  systemicAsk: z.array(z.string()).max(5),
  forums: z.array(z.object({ name: z.string(), why: z.string() })).max(4),
  caveats: z.array(z.string()).max(4),
});
export type ClusterBrief = z.infer<typeof ClusterBrief>;

export const Digest = z.object({ en: z.string().max(240), hi: z.string().max(300) });
export type Digest = z.infer<typeof Digest>;
