# Nivaran · निवारण

*A complaint. A paper trail. A way forward.*

[Live app](https://nivaran-indol.vercel.app) · [Source](https://github.com/harshkawatra11/nivaran) · MIT

Nivaran helps Delhi residents turn a civic problem into a reviewed complaint, record its official filing, and prepare follow-up documents when deadlines pass. Citizens review and submit every filing themselves.

## Try the app

1. Open **Report**, then **Try Meena’s case** for a fictional Hindi water-supply report.
2. Select **Prepare my complaint**. The eight-stage pipeline streams its progress into the case workspace.
3. Inspect the responsible office, research sources, review rounds, English/Hindi documents, and actual recorded model usage. Download the PDF.
4. For a demonstration only, record a fictional filing reference and today’s date. The demo clock’s **+30d** action prepares a reminder and RTI when the relevant policy periods have passed.
5. Record the RTI filing using the effective demo date, then advance another 30 days to prepare a First Appeal.
6. Open **Ward board** and a locality cluster to inspect the synthetic reports and a real Nemotron Ultra systemic brief.

The sample acknowledgement and reply images are watermarked **DEMO SAMPLE**. The board contains 60 seeded synthetic reports plus reports created on this deployment. Do not present sample filings as real government submissions.

## Current implementation

| Available | Remaining |
|---|---|
| Responsive homepage, report intake, case list and streamed workspace | Real-time voice agent and its separate hosting |
| Jurisdiction routing, safety triage, RTI linter and escalation rules | Independent legal-source verification for the Delhi pack |
| Evidence upload to private Supabase Storage | Full 30-case model evaluation harness |
| Live Tavily official-source research and Nemotron review | Nebius Serverless Job deployment |
| Bilingual document viewer and Unicode PDF packets | Narrated demo video and final Devpost submission |
| Manual/vision acknowledgement, reply review, filing steps and demo clock | Broader jurisdiction coverage |
| Ward map, clusters, systemic briefs, model ledger and nightly function | |

Voice is not currently available. The `/how` page reports limitations and usage without inventing evaluation results.

## NVIDIA Nemotron on Nebius Token Factory

All calls use `https://api.tokenfactory.nebius.com/v1`. Model IDs were verified against the live catalog on 26 October 2026; see [spike results](docs/SPIKE-RESULTS.md).

| Model tier | Runtime role |
|---|---|
| Lightning | Intake facts and Hindi copies |
| Super VL | Photos, acknowledgements and reply images |
| Super | Tavily tool-calling research, complaint drafting and revisions |
| Ultra | Adversarial review, reply judgment and systemic briefs |
| Nano | Nightly status digests |

Structured outputs are validated with Zod and have a repair retry. The code determines responsibility, emergency gates, deadlines and escalation transitions. Research citations must come from URLs actually returned by the web tools. Cost estimates come from recorded token usage and configured rates; they are not billing receipts.

A local live run reached `ready` in about 57 seconds, with 11 model calls costing approximately $0.0154. Timing and cost vary with the report and provider. The full filing → RTI → First Appeal lifecycle and cross-session access restrictions were exercised locally.

## Local setup

```bash
npm ci
cp .env.example .env.local
# Set NEBIUS_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
# Apply supabase/schema.sql and create a PRIVATE bucket called evidence.
npm run dev -- --port 3100
```

The service-role key stays server-side. Anonymous browser sessions use an HTTP-only cookie; private case access requires ownership. Public sample cases are read-only. Demo time travel affects only the current session. Review the limitations before using this hackathon build with real evidence.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e   # with the local app running on port 3100
npm run spike     # live model probes; consumes provider credits
npm run seed      # ensure 60 synthetic reports, without deleting existing reports
npm run seed -- --briefs  # generate real model-written cluster briefs
npm run demo:docs
npm run nightly
npm run build:job
```

## Deployment

Vercel hosts the app and a protected `/api/cron/nightly` fallback scheduled in `vercel.json`. Set `CRON_SECRET` in production. The same nightly function can run as a container job using `Dockerfile.job`; a deployed Nebius job is not yet claimed. Configure the four provider/database variables and the JSON-mode flags from the spike before deploying. Keep all keys in ignored environment files or Vercel secrets.

## Design and provenance

The paper-and-ink identity uses Fraunces, Inter Tight, JetBrains Mono and Tiro Devanagari Hindi. The logo was generated with Codex’s built-in image tool, then resized for browser and Apple icons. PDFs embed an OFL-licensed Tiro font; its license is included in `public/fonts/`.

Created for the Nebius × NVIDIA Global AI Hackathon. The author’s earlier Adhikaar project supplied the RTI linter and deadline-arithmetic pattern. The remaining pipeline, systemic layer and interface were built for this entry. Claude Code built the initial backend; Codex continued the citizen journey, design, integrations and verification. See [continuation plan](docs/CONTINUATION-PLAN.md) and [feedback log](docs/FEEDBACK-LOG.md).

Delhi civic services only. Policy timelines and office information still awaiting independent confirmation are marked **Source pending**. Not legal advice.

MIT © 2026 Harsh Kawatra. See [LICENSE](LICENSE).
