// The RTI question legality linter, ported from the author's earlier project Adhikaar
// (src/lib/linter/rules.ts, MIT-equivalent reuse within the same author's work). Every rule
// here is plain TypeScript evaluated against drafted RTI question text; nothing calls a
// model. A block-severity finding fails the ladder's test suite: Nivaran never files an RTI
// question an officer could refuse on a technicality the linter already knows about.
import type { LintFinding } from "@/lib/ladder/types";

export interface LintRule {
  id: string;
  title: string;
  citationId: string;
  severity: LintFinding["severity"];
  test: (question: string) => boolean;
  explanation: (question: string) => string;
  rewrite?: (question: string) => string | undefined;
}

const OPINION_MARKERS = /\b(why|should|shouldn't|is it fair|who is responsible|what do you think|justify|explain your (?:decision|reasoning))\b/i;
const LIFE_LIBERTY_MARKERS = /\b(life[- ]threatening|in custody|missing person|life or liberty|urgent medical|about to be evicted today|arrested)\b/i;
const UNBOUNDED_RANGE = /\b(all (?:files|records|documents)|every (?:file|record|document|order)|since inception|from the beginning|all correspondence)\b/i;
const NO_DATE_BOUND = (q: string) => !/\b(19|20)\d{2}\b/.test(q) && !/\bbetween\b.*\band\b/i.test(q);
const PERSONAL_INFO_MARKERS = /\b(salary of|personal file of|medical record of|marksheet of|caste certificate of|address of (?:mr|ms|mrs|dr)?\.?\s?\w+|assets of|income of|educational qualification of)\b/i;
const THIRD_PARTY_COMMERCIAL = /\b(trade secret|business plan of|pricing formula|tender document submitted by|bid submitted by)\b/i;
const INVESTIGATION_MARKERS = /\b(ongoing investigation|under investigation|fir under investigation|chargesheet not yet filed)\b/i;
const CABINET_MARKERS = /\b(cabinet note|cabinet minutes|council of ministers deliberation)\b/i;
const COURT_MARKERS = /\b(sub judice|pending before (?:the )?(?:court|tribunal))\b/i;
const SECURITY_MARKERS = /\b(raw|research and analysis wing|intelligence bureau|\bib\b(?!.{0,10}(?:electricity|epfo))|nsg|nia case file|army movement|troop deployment)\b/i;
const COPYRIGHT_MARKERS = /\b(published book|copyrighted material|licensed software source code)\b/i;

export const LINT_RULES: LintRule[] = [
  {
    id: "opinion-seeking",
    title: "Opinion or justification sought, not a record",
    citationId: "rti-2f",
    severity: "block",
    test: (q) => OPINION_MARKERS.test(q),
    explanation: () =>
      'This question asks the authority to explain, justify, or state an opinion, rather than to produce a record it already holds. Under section 2(f), "information" is material such as records, documents and orders, not an opinion the authority has not recorded. A Public Information Officer can refuse this question on that basis alone, without reaching any section 8 exemption.',
    rewrite: (q) => rewriteOpinionToRecord(q),
  },
  {
    id: "life-liberty-fast-track",
    title: "Life or liberty: forty-eight hour track applies",
    citationId: "rti-7-1",
    severity: "info",
    test: (q) => LIFE_LIBERTY_MARKERS.test(q),
    explanation: () =>
      "This question concerns the life or liberty of a person. The proviso to section 7(1) requires the information within forty-eight hours of receipt, not the ordinary thirty days. Mark this application for the fast track and confirm the PIO's receipt date precisely.",
  },
  {
    id: "overbroad-unbounded",
    title: "Unbounded request risks a disproportionate-diversion refusal",
    citationId: "rti-7-1",
    severity: "warn",
    test: (q) => UNBOUNDED_RANGE.test(q) && NO_DATE_BOUND(q),
    explanation: () =>
      "This question asks for an entire category of records with no date range. Authorities can and do refuse requests of this breadth as disproportionately diverting their resources, a ground Information Commissions have accepted even though it is not a named section 8 exemption. Bound the request to a specific period or a specific file to reduce refusal risk.",
    rewrite: (q) => q.replace(UNBOUNDED_RANGE, "$& for the period [insert specific date range]"),
  },
  {
    id: "personal-info-8-1-j",
    title: "Personal information: section 8(1)(j) now applies without a public-interest override",
    citationId: "rti-8-1-j-current",
    severity: "block",
    test: (q) => PERSONAL_INFO_MARKERS.test(q),
    explanation: () =>
      "This question seeks personal information about a named or identifiable individual. Since the substitution of section 8(1)(j) by the Digital Personal Data Protection Act, 2023, this exemption no longer carries a public-interest override or the earlier proviso protecting information that could not be denied to Parliament. A refusal on this ground is much harder to overturn on appeal than it was before.",
  },
  {
    id: "third-party-commercial",
    title: "Third-party commercial confidence: consultation required",
    citationId: "rti-8-1-d",
    severity: "warn",
    test: (q) => THIRD_PARTY_COMMERCIAL.test(q),
    explanation: () =>
      "This question touches commercial confidence or trade secrets belonging to a third party. Section 8(1)(d) exempts this unless larger public interest is shown, and if the officer intends to disclose, section 11 requires the officer to first notify the third party and invite a submission, which extends the timeline. Expect this application to take longer than thirty days even if it eventually succeeds.",
  },
  {
    id: "investigation-in-progress",
    title: "Ongoing investigation: time-bound exemption applies",
    citationId: "rti-8-1-h",
    severity: "warn",
    test: (q) => INVESTIGATION_MARKERS.test(q),
    explanation: () =>
      "This question concerns a matter still under investigation. Section 8(1)(h) exempts information that would impede an investigation, apprehension or prosecution, but the exemption lapses once that process concludes. If refused now, the same question can be refiled after the investigation or prosecution is complete.",
  },
  {
    id: "cabinet-papers",
    title: "Cabinet papers: exempt until the decision is complete",
    citationId: "rti-8-1-i",
    severity: "block",
    test: (q) => CABINET_MARKERS.test(q),
    explanation: () =>
      "Cabinet papers and records of Council of Ministers deliberations are exempt under section 8(1)(i). The decision itself, its reasons, and the material behind it become public once the decision has been taken and the matter is complete, but the deliberations themselves do not.",
  },
  {
    id: "court-forbidden",
    title: "Possible court restriction on disclosure",
    citationId: "rti-8-1-b",
    severity: "info",
    test: (q) => COURT_MARKERS.test(q),
    explanation: () =>
      "Section 8(1)(b) exempts information a court has expressly forbidden from being published, but a matter merely being sub judice is not, by itself, enough to invoke it. Confirm whether an actual court order restricts disclosure before treating this as blocked.",
  },
  {
    id: "security-organisation",
    title: "Possible Second Schedule security organisation",
    citationId: "rti-24-1",
    severity: "block",
    test: (q) => SECURITY_MARKERS.test(q),
    explanation: () =>
      "This question appears to concern a body listed in the Second Schedule of intelligence and security organisations, which section 24 excludes from the Act entirely, except for allegations of corruption or human rights violations, which remain answerable.",
  },
  {
    id: "copyright-third-party",
    title: "Possible third-party copyright",
    citationId: "rti-9",
    severity: "info",
    test: (q) => COPYRIGHT_MARKERS.test(q),
    explanation: () =>
      "Section 9 allows a Public Information Officer to reject a request that would infringe a copyright held by someone other than the State. This is separate from, and additional to, the section 8 exemptions.",
  },
  {
    id: "sovereignty-security",
    title: "Sovereignty, security or strategic interest",
    citationId: "rti-8-1-a",
    severity: "warn",
    test: (q) =>
      /\b(national security|troop position|border deployment|strategic reserve|nuclear facility|defence procurement contract value)\b/i.test(q),
    explanation: () =>
      "This question touches sovereignty, security, or strategic interest, exempt under section 8(1)(a) where disclosure would prejudicially affect those interests. The exemption requires a demonstrable prejudicial effect, not a blanket classification.",
  },
  {
    id: "fiduciary-relationship",
    title: "Fiduciary relationship information",
    citationId: "rti-8-1-e",
    severity: "warn",
    test: (q) => /\b(doctor's notes on|patient file of|advice given by (?:my|the) (?:lawyer|advocate|counsel)|trustee's records of)\b/i.test(q),
    explanation: () =>
      "This question asks for information held in a relationship of trust, such as doctor-patient or trustee-beneficiary, exempt under section 8(1)(e) unless larger public interest is shown.",
  },
  {
    id: "foreign-government-confidence",
    title: "Confidential foreign government information",
    citationId: "rti-8-1-f",
    severity: "info",
    test: (q) => /\b(shared by (?:the )?(?:us|uk|foreign) (?:embassy|government)|received in confidence from)\b/i.test(q),
    explanation: () => "Information received in confidence from a foreign government is exempt under section 8(1)(f) with no public-interest override stated in the clause itself.",
  },
  {
    id: "parliamentary-privilege",
    title: "Possible breach of parliamentary or legislative privilege",
    citationId: "rti-8-1-c",
    severity: "info",
    test: (q) => /\b(parliamentary committee proceedings|legislative privilege|assembly committee proceedings)\b/i.test(q),
    explanation: () => "Information whose disclosure would breach a privilege of Parliament or a State Legislature is exempt under section 8(1)(c).",
  },
  {
    id: "third-party-notice-timeline",
    title: "Third-party consultation will extend the timeline",
    citationId: "rti-11-1",
    severity: "warn",
    test: (q) => /\b(information (?:about|regarding|on) (?:a )?(?:competitor|another company|another applicant)|supplied by a third party)\b/i.test(q),
    explanation: () =>
      "Where the information was supplied by a third party and treated as confidential, section 11(1) requires the officer to notify that party and invite a submission before deciding, within a forty-day outer limit. Warn the applicant that this will likely take longer than the ordinary thirty days.",
  },
  {
    id: "language-of-application",
    title: "Application must be in English, Hindi, or the local official language",
    citationId: "rti-6-1",
    severity: "block",
    test: (q) => /\b(en francais|auf deutsch|en espanol|in mandarin|in arabic)\b/i.test(q),
    explanation: () => "Section 6(1) requires the application to be made in English, Hindi, or the official language of the area where it is filed.",
  },
  {
    id: "no-reason-required-check",
    title: "Do not state a personal justification for wanting the information",
    citationId: "rti-6-2",
    severity: "info",
    test: (q) => /\b(i need this because|i want this so that|the reason i am asking is)\b/i.test(q),
    explanation: () =>
      "Section 6(2) entitles the applicant to withhold any reason for the request. Stating a personal justification is not required and does not strengthen the application.",
    rewrite: (q) => q.replace(/\b(i need this because|i want this so that|the reason i am asking is)\b.*$/i, "").trim() || undefined,
  },
  {
    id: "twenty-year-sunset",
    title: "Records over twenty years old: most exemptions lapse",
    citationId: "rti-8-3",
    severity: "info",
    test: (q) => /\b(19[0-8]\d|199[0-5])\b/.test(q),
    explanation: () =>
      "This question concerns records more than roughly twenty years old. Section 8(3) requires disclosure of such records regardless of most section 8(1) exemptions, other than clauses (a), (c) and (i).",
  },
];

function rewriteOpinionToRecord(q: string): string | undefined {
  const trimmed = q.trim().replace(/\?$/, "");
  if (/^why\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^why\s+/i, "");
    return `Please provide a certified copy of the file noting, order, or record that documents the reasons for ${rest}.`;
  }
  if (/^should\b/i.test(trimmed) || /^shouldn't\b/i.test(trimmed)) {
    return `Please provide a certified copy of any policy, rule, or order governing this decision.`;
  }
  if (/is it fair/i.test(trimmed)) {
    return `Please provide a certified copy of the criteria or rules applied in this decision.`;
  }
  return undefined;
}

export function lintQuestion(question: string): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const rule of LINT_RULES) {
    if (rule.test(question)) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        title: rule.title,
        explanation: rule.explanation(question),
        citationId: rule.citationId,
        suggestedRewrite: rule.rewrite?.(question),
      });
    }
  }
  return findings;
}
