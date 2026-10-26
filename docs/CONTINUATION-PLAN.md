# Nivaran continuation — 26 October 2026

Original specification: `C:\Users\harsh\.claude\plans\eventually-what-you-can-buzzing-rabin.md`.
This supplements that plan; the original remains intact.

## Audit
The deployed repository contains the deterministic core, pipeline, API routes, PDF generation, and homepage. Navigation targets and citizen workflow screens are missing. No live model credentials were configured at handoff. The README describes several journeys that are not yet available.

## Execution
- [x] Inspect export, repository instructions, original specification, and deployment.
- [x] Create dedicated Supabase project, Mumbai region; save server-only credentials locally.
- [x] Apply schema, create private evidence storage, and verify access.
- [x] Complete report, case list, streamed case workspace, filing/reply actions, and demo clock.
- [x] Complete ward board, cluster detail, and model transparency screens.
- [x] Improve homepage and shared responsive navigation, preserving existing visual identity.
- [x] Generate logo and favicon, install assets and metadata.
- [x] Verify model catalog and capabilities with the existing spike once Nebius sign-in is available.
- [x] Configure Vercel production environment and complete local tests, build, and responsive browser checks.
- [x] Deploy and verify production.

## Verification and boundaries
Test SSE chunk parsing and input validation. Run deterministic tests and production build. Exercise report creation, live pipeline, document packet, filing, clock, board, cluster and ledger as credentials permit. Samples are labeled; unavailable providers return actionable errors rather than invented output.

## Remaining original-plan work
Voice service port and deployment (T41–47), source verification/impact research (T07–08), full evaluation (T29), Nebius nightly job deployment (T31), and narrated video/submission assets remain separate deliverables. Do not claim these are complete before exercising them.

## Verified results
- Dedicated Supabase database and private evidence bucket initialized.
- All five live Nemotron tiers probed; native app Tavily search verified against official Delhi sources.
- 60 synthetic reports; six systemic briefs generated with real Ultra calls.
- Live Hindi report reached ready in about 57 seconds; 11 calls, estimated $0.015422.
- PDF download, manual filing, clock +31 days, RTI filing, clock +31 days, First Appeal, and cross-session access restrictions passed.
- Browser widths 390, 768, 1440 checked; three committed browser regression tests pass.
- Unicode PDF regression covers model punctuation and Hindi.
- Nightly sweep: 51 cases, no errors; standalone job bundle builds. Nebius job is not yet deployed.
- Tavily CLI authenticated, live search verified, eight official Codex skills installed. Auto-discovery may require restart/rescan.
- Branding generated using the built-in image tool: cream N/clock monogram on verdigris. Source at public/brand/nivaran-logo.png; favicon and Apple icon installed.

## Production verification
Production alias: https://nivaran-indol.vercel.app
Deployment: dpl_J8r5mWgi9Sp1QyHfP9m1QjgNFKVg (Ready).
Draft PR: https://github.com/harshkawatra11/nivaran/pull/1. Master remains unmerged.
A fresh production Hindi report reached ready with 11 model calls (estimated $0.014764); its owned PDF downloaded (397,281 bytes). Public sample PDFs, favicon, board and ledger returned successfully. Cron rejects unauthenticated requests with 401. All three browser regression tests passed against production.

Final local checks: 126 unit tests, lint, typecheck and production build pass.
