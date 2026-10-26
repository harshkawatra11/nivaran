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
