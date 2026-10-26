import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ModelChip } from "@/components/ModelChip";
import { Seal } from "@/components/Seal";

const TIERS = [
  { key: "lightning" as const, job: "Reads your complaint in real time, extracts facts, runs the voice agent" },
  { key: "superVL" as const, job: "Reads your photo, the filing receipt, and the government's reply" },
  { key: "super" as const, job: "Searches official sources live with Tavily, then drafts the letter" },
  { key: "ultra" as const, job: "Reviews the draft the way a tired officer would, before it is sent" },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">Nebius x NVIDIA Global AI Hackathon &middot; Best Apps &amp; Agents</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-ink max-w-2xl">
            File once. <span className="text-verdigris">We keep the government&rsquo;s clock.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-2 max-w-xl leading-relaxed">
            Send a photo and a few sentences about a broken pump, an overflowing bin, or a missing medicine. Nivaran decides who is legally responsible, drafts a complaint that is hard
            to close, and escalates it on its own, by law, every time a deadline passes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/report" className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-mono hover:bg-ink-2 transition-colors">
              Report a problem
            </Link>
            <Link href="/board" className="rounded-full border border-rule px-6 py-3 text-sm font-mono text-ink-2 hover:border-ink transition-colors">
              See the ward board
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 border-t border-rule">
          <h2 className="font-display text-2xl font-semibold mb-6">The law already has a clock. Nobody runs it for you.</h2>
          <div className="grid sm:grid-cols-3 gap-4 font-mono text-sm text-ink-2">
            <div className="card p-4">
              <div className="text-2xl font-display text-ink mb-1">30 days</div>
              Every RTI request has a legal deadline. Miss it, and the law calls it a refusal &mdash; automatically, under section 7(2).
            </div>
            <div className="card p-4">
              <div className="text-2xl font-display text-ink mb-1">90 days</div>
              After a missed First Appeal, the citizen has 90 days to reach the Information Commission &mdash; a window almost nobody tracks by hand.
            </div>
            <div className="card p-4">
              <div className="text-2xl font-display text-ink mb-1">1 complaint &rarr; many</div>
              The same failure, repeated across a street, becomes a systemic case a legal aid clinic can act on.
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            Sources: Right to Information Act, 2005, sections 7(2), 19(1) and 19(3). See <Link href="/how" className="underline">how it works</Link> for the full citation list.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 border-t border-rule">
          <h2 className="font-display text-2xl font-semibold mb-2">How it works</h2>
          <p className="text-ink-2 mb-6 max-w-xl">Four NVIDIA Nemotron models on Nebius Token Factory, each sized for its job. The models propose. The code decides.</p>
          <ol className="space-y-4">
            {[
              { n: 1, t: "Report", d: "Photo + a few sentences, in Hindi or English, typed or spoken to the voice agent." },
              { n: 2, t: "Decide (code)", d: "The responsible office and the legal deadline come from a versioned rule pack, not a guess." },
              { n: 3, t: "Research & draft", d: "An agent checks the live official channel, then drafts the letter." },
              { n: 4, t: "Review", d: "Ultra attacks the draft like a reluctant officer, before anything is sent." },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-display text-2xl text-muted w-8 shrink-0">{s.n}</span>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-ink-2">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 border-t border-rule">
          <h2 className="font-display text-2xl font-semibold mb-6">The model ledger</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TIERS.map((t) => (
              <div key={t.key} className="card p-4">
                <ModelChip model={t.key} />
                <p className="mt-2 text-sm text-ink-2">{t.job}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Seal kind="code" />
            <Seal kind="ultra" />
          </div>
        </section>

        <footer className="mx-auto max-w-4xl px-4 sm:px-6 py-10 border-t border-rule text-xs text-muted font-mono">
          Built with NVIDIA Nemotron on Nebius Token Factory, a Nebius Serverless Job, and Tavily. &middot;{" "}
          <a href="https://github.com/harshkawatra11/nivaran" className="underline">
            GitHub
          </a>{" "}
          &middot; MIT License &middot; Not legal advice.
        </footer>
      </main>
    </>
  );
}
