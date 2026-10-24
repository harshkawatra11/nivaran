// Minimal RTI Act, 2005 corpus: just enough section text for every linter rule's citation
// to resolve to something real and checkable. Source: indiacode.nic.in, The Right to
// Information Act, 2005 (Act No. 22 of 2005). Not a substitute for the full text.
export interface CorpusChunk {
  id: string;
  act: string;
  section: string;
  heading: string;
  text: string;
  sourceUrl: string;
}

export const RTI_CORPUS: CorpusChunk[] = [
  {
    id: "rti-2f",
    act: "Right to Information Act, 2005",
    section: "2(f)",
    heading: "Definition of information",
    text: '"information" means any material in any form, including records, documents, memos, e-mails, opinions, advices, press releases, circulars, orders, logbooks, contracts, reports, papers, samples, models, data material held in any electronic form and information relating to any private body which can be accessed by a public authority under any other law for the time being in force.',
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-6-1",
    act: "Right to Information Act, 2005",
    section: "6(1)",
    heading: "Request for obtaining information",
    text: "A person who desires to obtain any information under this Act shall make a request in writing or through electronic means in English or Hindi or in the official language of the area in which the application is being made.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-6-2",
    act: "Right to Information Act, 2005",
    section: "6(2)",
    heading: "No reason required",
    text: "An applicant making a request for information shall not be required to give any reason for requesting the information or any other personal details except those that may be necessary for contacting him.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-6-3",
    act: "Right to Information Act, 2005",
    section: "6(3)",
    heading: "Transfer of a misdirected application",
    text: "Where an application is made to a public authority requesting information which is held by another public authority, or the subject matter of which is more closely connected with the functions of another public authority, the public authority to which such application is made shall transfer the application within five days to that other public authority.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-7-1",
    act: "Right to Information Act, 2005",
    section: "7(1)",
    heading: "Disposal of request",
    text: "On receipt of a request under section 6, the Central Public Information Officer or State Public Information Officer shall, as expeditiously as possible, and in any case within thirty days of the receipt of the request, either provide the information on payment of such fee as may be prescribed or reject the request: Provided that where the information sought concerns the life or liberty of a person, the same shall be provided within forty-eight hours of the receipt of the request.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-7-2",
    act: "Right to Information Act, 2005",
    section: "7(2)",
    heading: "Deemed refusal",
    text: "If the Public Information Officer fails to give decision on the request for information within the period specified under sub-section (1), the Public Information Officer shall be deemed to have refused the request.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-7-6",
    act: "Right to Information Act, 2005",
    section: "7(6)",
    heading: "Free information after missed deadline",
    text: "Notwithstanding anything contained in sub-section (5), the person making request for the information shall be provided the information free of charge where a public authority fails to comply with the time limits specified in sub-section (1).",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-a",
    act: "Right to Information Act, 2005",
    section: "8(1)(a)",
    heading: "Sovereignty, security, strategic interest",
    text: "Information, disclosure of which would prejudicially affect the sovereignty and integrity of India, the security, strategic, scientific or economic interests of the State, relation with foreign State or lead to incitement of an offence, is exempt from disclosure.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-b",
    act: "Right to Information Act, 2005",
    section: "8(1)(b)",
    heading: "Court-forbidden disclosure",
    text: "Information the disclosure of which has been expressly forbidden by any court of law or tribunal or the disclosure of which may constitute contempt of court is exempt from disclosure.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-c",
    act: "Right to Information Act, 2005",
    section: "8(1)(c)",
    heading: "Parliamentary or legislative privilege",
    text: "Information, the disclosure of which would cause a breach of privilege of Parliament or the State Legislature, is exempt from disclosure.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-d",
    act: "Right to Information Act, 2005",
    section: "8(1)(d)",
    heading: "Commercial confidence, trade secrets",
    text: "Information including commercial confidence, trade secrets or intellectual property, the disclosure of which would harm the competitive position of a third party, is exempt unless the competent authority is satisfied that larger public interest warrants the disclosure of such information.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-e",
    act: "Right to Information Act, 2005",
    section: "8(1)(e)",
    heading: "Fiduciary relationship",
    text: "Information available to a person in his fiduciary relationship is exempt from disclosure unless the competent authority is satisfied that the larger public interest warrants the disclosure of such information.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-f",
    act: "Right to Information Act, 2005",
    section: "8(1)(f)",
    heading: "Foreign government confidence",
    text: "Information received in confidence from a foreign Government is exempt from disclosure.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-h",
    act: "Right to Information Act, 2005",
    section: "8(1)(h)",
    heading: "Investigation, apprehension, prosecution",
    text: "Information which would impede the process of investigation or apprehension or prosecution of offenders is exempt from disclosure, until that process is complete.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-i",
    act: "Right to Information Act, 2005",
    section: "8(1)(i)",
    heading: "Cabinet papers",
    text: "Cabinet papers including records of deliberations of the Council of Ministers, Secretaries and other officers are exempt: provided that the decisions of Council of Ministers, the reasons thereof, and the material on the basis of which the decisions were taken shall be made public after the decision has been taken, and the matter is complete, or over.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-1-j-current",
    act: "Right to Information Act, 2005",
    section: "8(1)(j), as substituted by the Digital Personal Data Protection Act, 2023",
    heading: "Personal information",
    text: "Information which relates to personal information the disclosure of which has no relationship to any public activity or interest, or which would cause unwarranted invasion of the privacy of the individual, is exempt from disclosure. (Section 44(3), Digital Personal Data Protection Act, 2023 substituted the earlier text of clause (j), removing its public-interest override and its proviso, with effect from 13 November 2025.)",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-8-3",
    act: "Right to Information Act, 2005",
    section: "8(3)",
    heading: "Twenty-year sunset",
    text: "Notwithstanding anything in sub-clauses (a), (c) and (i) of sub-section (1), any information relating to any occurrence, event or matter which has taken place, occurred or happened twenty years before the date on which any request is made under section 6 shall be provided.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-9",
    act: "Right to Information Act, 2005",
    section: "9",
    heading: "Third-party copyright",
    text: "A Central Public Information Officer or a State Public Information Officer may reject a request for information where such a request involves an infringement of copyright subsisting in a person other than the State.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-11-1",
    act: "Right to Information Act, 2005",
    section: "11(1)",
    heading: "Third-party information",
    text: "Where a Central Public Information Officer or a State Public Information Officer intends to disclose any information supplied by a third party and treated as confidential by that third party, the officer shall, within five days of receipt of the request, give written notice to such third party inviting it to make a submission, and the third party shall be given a chance to make a submission within ten days; the final decision shall be made within forty days of the receipt of the request.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-19-1",
    act: "Right to Information Act, 2005",
    section: "19(1)",
    heading: "First appeal",
    text: "Any person who, does not receive a decision within the time specified in sub-section (1) or clause (a) of sub-section (3) of section 7, or is aggrieved by a decision of the Central Public Information Officer or State Public Information Officer, may within thirty days from the expiry of such period or from the receipt of such a decision prefer an appeal to such officer who is senior in rank to the Public Information Officer.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-19-3",
    act: "Right to Information Act, 2005",
    section: "19(3)",
    heading: "Second appeal",
    text: "A second appeal against the decision under sub-section (1) shall lie within ninety days from the date on which the decision should have been made or was actually received, with the Central Information Commission or the State Information Commission.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-19-6",
    act: "Right to Information Act, 2005",
    section: "19(6)",
    heading: "First appeal disposal period",
    text: "An appeal under sub-section (1) or sub-section (2) shall be disposed of within thirty days of the receipt of the appeal or within such extended period not exceeding a total of forty-five days from the date of filing thereof, as the case may be, for reasons to be recorded in writing.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
  {
    id: "rti-24-1",
    act: "Right to Information Act, 2005",
    section: "24(1)",
    heading: "Second Schedule exclusion",
    text: "Nothing contained in this Act shall apply to the intelligence and security organisations specified in the Second Schedule, being organisations established by the Central Government: Provided that the information pertaining to the allegations of corruption and human rights violations shall not be excluded under this sub-section: Provided further that in the case of information sought for is in respect of allegations of violation of human rights, the information shall only be provided after the approval of the Central Information Commission, and notwithstanding anything contained in section 7, such information shall be provided within forty-five days from the date of the receipt of request.",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1362",
  },
];

const BY_ID = new Map(RTI_CORPUS.map((c) => [c.id, c]));

export function resolveCitation(citationId: string): CorpusChunk {
  const chunk = BY_ID.get(citationId);
  if (!chunk) throw new Error(`Unknown RTI corpus citation: ${citationId}`);
  return chunk;
}

export function tryResolveCitation(citationId: string): CorpusChunk | null {
  return BY_ID.get(citationId) ?? null;
}
