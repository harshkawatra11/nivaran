# Feedback log

Append-only. Every executor adds a dated bullet here when they hit friction with Nebius
Token Factory, the Nebius CLI/Serverless products, NVIDIA Nemotron models, or Tavily. This
feeds both `docs/DEVPOST.md`'s required feedback section and the README's feedback section.

## 2026-10-26

- **npm peer-dependency conflict on a clean install (not Nebius-specific, but worth noting
  for anyone starting from a similar Next.js 16 + Vitest 5 scaffold):** `vitest@5` depends
  on `vite@8`, which requires `@types/node ^22 || >=24`. `create-next-app` installs
  `@types/node@^20` by default. A clean `npm install` on Vercel's build environment (no
  `--legacy-peer-deps`) failed with `ERESOLVE` until `@types/node` was bumped to latest.
- **Next.js 16 Cache Components rejects both `export const runtime` and
  `export const dynamic` in Route Handlers.** Every route that touches Supabase directly
  (no `cookies()`/`headers()` call to signal dynamism to Next) needs an explicit
  `await connection()` from `next/server` as its first statement, or the build tries to
  prerender the route and crashes on missing env vars. Confirmed against
  `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`.
- **Vercel's deployment protection (SSO / Vercel Authentication) is on by default for new
  team projects**, which would silently block the hackathon's "free of charge and without
  any restriction" demo URL requirement for judges. `vercel project protection disable
  <name> --sso` is the fix via CLI; worth a callout in the hackathon's onboarding material
  since it is easy to miss.
- (Pending) Token Factory model catalog casing: `nvidia/nemotron-3-super-120b-a12b` is
  lowercase while every other NVIDIA model id on the catalog is mixed-case
  (`NVIDIA-Nemotron-3-Nano-30B-A3B`, `Nemotron-3-Ultra-550b-a55b`, etc.). This is an easy
  place to get a 404 from a typo'd id; a consistent casing convention across the catalog
  would help.
- (Pending, to fill once `npm run spike` is run against a real key) `chat_template_kwargs:
  {enable_thinking:false}` pass-through, `json_schema` strict-mode support per tier, and
  observed latency/cost per tier from real traffic.

## 2026-10-26 — continuation and live verification

- Verified all five Nemotron IDs using the live Token Factory catalog. Chat, tool calls and vision succeeded. `enable_thinking:false` was accepted by all five. Short JSON-schema probes parsed on 3/5 tiers and JSON-object on 4/5; the application retains validation and a repair retry. Full results are in SPIKE-RESULTS.md.
- A live Hindi sample reached ready in roughly 57 seconds with 11 recorded calls, estimated at $0.015422. The current pipeline handled schema repair and generated both language copies.
- Verified Tavily CLI OAuth plus the app's native REST integration. An official-domain DJB search returned three government sources. Installed the eight official Tavily Codex skills; a client rescan may be needed for automatic discovery in future sessions.
- Exercised filing, a +31-day jump, RTI filing, another +31-day jump, and First Appeal generation. Cross-session reads and anonymous sample mutations were rejected.
- Found and fixed the original PDF renderer's WinAnsi failure on a model-generated non-breaking hyphen. Noto Devanagari triggered a fontkit anchor error on common Hindi words; Tiro Devanagari Hindi passed the regression and is embedded in packets.
- Fixed a board metric that labeled an average as a median, and added explicit ownership and input validation around filing actions.
