// Deterministic legal-document skeletons. An LLM (Nemotron Super) only fills the facts
// paragraph slot; every other line, section citation, and legal consequence is fixed here.
import type { DocumentKind } from "@/lib/ladder/types";
import type { Authority } from "@/lib/packs/types";

export const RTI_QUESTION_TEMPLATES: string[] = [
  "Provide the current status of grievance no. {{REF}} dated {{FILED}}, including the date it was received and the officer to whom it was assigned.",
  "Provide certified copies of the file notings, action-taken reports and correspondence on grievance no. {{REF}} from {{FILED}} to the date of this application.",
  "Provide the name and designation of the officer responsible for disposing of this grievance, and the time limit prescribed for its disposal under the applicable citizen charter or rules.",
  "Provide a copy of the rules, circular or citizen charter prescribing the time limit for redress of grievances of this category.",
];

export interface TemplateInput {
  applicantName: string;
  authority: Authority;
  subject: string;
  factsParagraph: string;
  requestedActions: string[];
  ref?: string;
  filedDate?: string;
  rtiQuestions?: string[];
  groundsOfAppeal?: string[];
  missedDeadlineLabel?: string;
  missedDeadlineDate?: string;
  commissionName?: string;
}

const CLOSING = "Drafted by Nivaran for the citizen's review before filing. This is not legal advice.";

export function renderTemplate(kind: DocumentKind, input: TemplateInput): { title: string; body: string } {
  const today = new Date().toISOString().slice(0, 10);
  switch (kind) {
    case "grievance":
      return renderGrievance(input, today);
    case "reminder":
      return renderReminder(input, today);
    case "rti":
      return renderRti(input, today);
    case "first_appeal":
      return renderFirstAppeal(input, today);
    case "second_appeal":
      return renderSecondAppeal(input, today);
    case "collective":
      return renderCollective(input, today);
  }
}

function renderGrievance(i: TemplateInput, today: string): { title: string; body: string } {
  const lines = [
    `GRIEVANCE: ${i.subject}`,
    "",
    "To,",
    i.authority.pioDesignation || i.authority.name,
    i.authority.name,
    "",
    `Date: ${today}`,
    "",
    `Subject: ${i.subject}`,
    "",
    "Sir or Madam,",
    "",
    i.factsParagraph,
    "",
    "I request that the following action be taken:",
    ...i.requestedActions.map((a, n) => `${n + 1}. ${a}`),
    "",
    "Yours faithfully,",
    i.applicantName,
    "",
    "---",
    CLOSING,
  ];
  return { title: i.subject, body: lines.join("\n") };
}

function renderReminder(i: TemplateInput, today: string): { title: string; body: string } {
  const lines = [
    `REMINDER: Grievance no. ${i.ref ?? "[reference pending]"}`,
    "",
    "To,",
    i.authority.name,
    "",
    `Date: ${today}`,
    "",
    `Subject: Reminder regarding grievance no. ${i.ref ?? "[reference pending]"} dated ${i.filedDate ?? "[date pending]"}`,
    "",
    "Sir or Madam,",
    "",
    `I filed the above grievance on ${i.filedDate ?? "[date pending]"}. The service standard applicable to this category has now passed with no action communicated to me. I request that this grievance be resolved without further delay, and that I be informed of the action taken.`,
    "",
    "Yours faithfully,",
    i.applicantName,
    "",
    "---",
    CLOSING,
  ];
  return { title: `Reminder: ${i.subject}`, body: lines.join("\n") };
}

function renderRti(i: TemplateInput, today: string): { title: string; body: string } {
  const questions = i.rtiQuestions ?? RTI_QUESTION_TEMPLATES;
  const lines = [
    "APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005",
    "",
    "To,",
    i.authority.pioDesignation,
    i.authority.name,
    "",
    `Date: ${today}`,
    "",
    "Sir or Madam,",
    "",
    "I request the following information under the Right to Information Act, 2005:",
    ...questions.map((q, n) => `${n + 1}. ${q.replace("{{REF}}", i.ref ?? "[reference pending]").replace("{{FILED}}", i.filedDate ?? "[date pending]")}`),
    "",
    "I enclose the prescribed application fee. If I am entitled to a fee waiver (Below Poverty Line), proof is attached.",
    "",
    "Yours faithfully,",
    i.applicantName,
    "",
    "---",
    CLOSING,
  ];
  return { title: `RTI application: ${i.subject}`, body: lines.join("\n") };
}

function renderFirstAppeal(i: TemplateInput, today: string): { title: string; body: string } {
  const lines = [
    "FIRST APPEAL UNDER SECTION 19(1) OF THE RIGHT TO INFORMATION ACT, 2005",
    "",
    "To,",
    i.authority.faaDesignation,
    i.authority.name,
    "",
    `Date: ${today}`,
    "",
    "Subject: First appeal against deemed refusal under section 7(2)",
    "",
    "Sir or Madam,",
    "",
    `I filed an application under section 6(1) of the Right to Information Act, 2005, addressed to the Public Information Officer, seeking the information set out below. No decision was communicated within the period specified in section 7(1), which expired on ${i.missedDeadlineDate ?? "[date pending]"}. Under section 7(2) of the Act, the Public Information Officer is deemed to have refused the request.`,
    "",
    "Particulars of information originally sought:",
    ...(i.rtiQuestions ?? RTI_QUESTION_TEMPLATES).map((q, n) => `${n + 1}. ${q}`),
    ...(i.groundsOfAppeal?.length ? ["", "Additional grounds of appeal:", ...i.groundsOfAppeal.map((g, n) => `${n + 1}. ${g}`)] : []),
    "",
    "As the statutory time limit was not met, I submit that, under section 7(6) of the Act, this information must now be provided to me free of charge, notwithstanding any fee otherwise prescribed.",
    "",
    "I request that this appeal be disposed of within the time limit prescribed under section 19(6) of the Act, and that the Public Information Officer be directed to furnish the information sought without further delay and without any fee.",
    "",
    "Yours faithfully,",
    i.applicantName,
    "",
    "---",
    `This appeal was drafted automatically by Nivaran on the date the statutory response deadline lapsed, citing sections 7(2), 19(1) and 7(6) of the Right to Information Act, 2005. It is a draft for human review before filing, not legal advice.`,
  ];
  return { title: `First Appeal: ${i.subject}`, body: lines.join("\n") };
}

function renderSecondAppeal(i: TemplateInput, today: string): { title: string; body: string } {
  const lines = [
    "SECOND APPEAL UNDER SECTION 19(3) OF THE RIGHT TO INFORMATION ACT, 2005",
    "",
    "To,",
    i.commissionName ?? "The Information Commission",
    "",
    `Date: ${today}`,
    "",
    "Subject: Second appeal, first appellate authority failed to dispose of the appeal within the prescribed period",
    "",
    "Sir or Madam,",
    "",
    `I filed a first appeal under section 19(1) of the Right to Information Act, 2005, which was not disposed of within the period prescribed under section 19(6), which expired on ${i.missedDeadlineDate ?? "[date pending]"}. I now file this second appeal under section 19(3).`,
    "",
    "Particulars of information originally sought:",
    ...(i.rtiQuestions ?? RTI_QUESTION_TEMPLATES).map((q, n) => `${n + 1}. ${q}`),
    ...(i.groundsOfAppeal?.length ? ["", "Grounds of appeal:", ...i.groundsOfAppeal.map((g, n) => `${n + 1}. ${g}`)] : []),
    "",
    "I request that the Commission direct the Public Information Officer to furnish the information sought, and consider the penalty provisions under section 20 of the Act given the delay.",
    "",
    "Yours faithfully,",
    i.applicantName,
    "",
    "---",
    CLOSING,
  ];
  return { title: `Second Appeal: ${i.subject}`, body: lines.join("\n") };
}

function renderCollective(i: TemplateInput, today: string): { title: string; body: string } {
  const lines = [
    `COLLECTIVE REPRESENTATION: ${i.subject}`,
    "",
    "To,",
    i.authority.name,
    "Copy to: Delhi State Legal Services Authority (DSLSA)",
    "",
    `Date: ${today}`,
    "",
    `Subject: ${i.subject}`,
    "",
    "We write on behalf of multiple citizens affected by the same unresolved failure, documented individually and summarised below.",
    "",
    i.factsParagraph,
    "",
    "We request:",
    ...i.requestedActions.map((a, n) => `${n + 1}. ${a}`),
    "",
    "---",
    "This representation was prepared by Nivaran from multiple citizen-filed grievances in the same area. It is for review by a legal aid clinic or the authority before use; it is not legal advice.",
  ];
  return { title: i.subject, body: lines.join("\n") };
}
