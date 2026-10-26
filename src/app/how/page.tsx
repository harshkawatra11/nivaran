"use client";
import { useState, useEffect } from "react";
import { AppShell, PageIntro, Notice } from "@/components/AppShell";
import { ModelChip } from "@/components/ModelChip";
import { MODELS, type ModelKey } from "@/lib/llm/models";
import { api } from "@/lib/browser-api";
type Ledger = {
  totalCalls: number;
  totalCostUsd: number;
  models: {
    key: ModelKey;
    calls: number;
    avgMs: number;
    avgCostUsd: number;
    errors: number;
  }[];
  nightlyLastRun: {
    at: string;
    payload: {
      casesScanned?: number;
      briefsRefreshed?: number;
      errors?: string[];
    };
  } | null;
};
export default function How() {
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Ledger>("/api/ledger")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <AppShell>
      <PageIntro
        eyebrow="OPEN TO INSPECTION"
        title="The models propose. The code decides."
      >
        AI helps read, research, and write. The rules that route a case and
        advance its clock are plain, testable code.
      </PageIntro>
      <section className="panel">
        <h2>Who decides what?</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Models assist with</th>
                <th>Code controls</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Reading photos and extracting the citizen’s account",
                  "Emergency gates and missing-information checks",
                ],
                [
                  "Researching official sources and drafting the complaint",
                  "Responsible-office routing from the Delhi jurisdiction pack",
                ],
                [
                  "Reviewing drafts and interpreting reply content",
                  "Deadline arithmetic and the next escalation step",
                ],
                [
                  "Summarizing repeated failures across a locality",
                  "Which reports belong in a locality cluster",
                ],
              ].map(([a, b]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Eight steps, one paper trail</h2>
        <ol className="process-list">
          {[
            [
              "Read → understand",
              "Vision reads optional evidence. Lightning extracts the complaint facts.",
            ],
            [
              "Triage → decide",
              "Code checks urgent hazards, asks for missing details, and resolves responsibility.",
            ],
            [
              "Research → draft",
              "Super checks official sources with Tavily and prepares the letter.",
            ],
            [
              "Review → package",
              "Ultra checks rejection risks; the draft can be revised before packaging.",
            ],
          ].map(([title, copy], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <h2>A model sized for each job</h2>
        <p className="aside-note">
          All reasoning calls use NVIDIA Nemotron through Nebius Token Factory.
          The ledger below reflects calls recorded by this deployment.
        </p>
        {error && <Notice error>Live usage is unavailable: {error}</Notice>}
        {data && (
          <div className="metric-row">
            <div>
              <strong>{data.totalCalls}</strong>
              <span>Recorded calls</span>
            </div>
            <div>
              <strong>${Number(data.totalCostUsd).toFixed(4)}</strong>
              <span>Estimated model cost from recorded token usage</span>
            </div>
          </div>
        )}
        <div className="model-rows">
          {Object.values(MODELS).map((m) => {
            const stats = data?.models.find((s) => s.key === m.key);
            return (
              <div key={m.key}>
                <div>
                  <ModelChip model={m.key} />
                </div>
                <section>
                  <h3>{m.label}</h3>
                  <p>{m.role}</p>
                  <code>{m.id}</code>
                  <p className="help">
                    {stats
                      ? `${stats.calls} calls · ${(stats.avgMs / 1000).toFixed(1)}s average · $${Number(stats.avgCostUsd).toFixed(5)} average · ${stats.errors} failed`
                      : "Usage not loaded yet"}
                  </p>
                </section>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h2>The nightly follow-through</h2>
        <p className="aside-note">
          The shared nightly function advances open cases through their
          escalation rules, writes status digests, groups nearby reports, and
          refreshes systemic briefs. A Vercel cron route is configured; the
          separate Nebius Serverless Job deployment has not yet been verified.
        </p>
        <p className="help">
          Last recorded run:{" "}
          {data?.nightlyLastRun
            ? new Date(data.nightlyLastRun.at).toLocaleString("en-IN")
            : "No run recorded yet"}
        </p>
      </section>
      <section className="panel">
        <h2>What we can—and can’t—promise</h2>
        <ul className="rule-list">
          <li>
            Delhi civic services only. Office information and policy timelines
            awaiting verification are marked “Source pending”.
          </li>
          <li>
            Citizens review and file their own documents. Nivaran does not
            automatically submit filings or guarantee government action.
          </li>
          <li>
            Model cost is an estimate from configured per-token rates, not a
            billing receipt.
          </li>
          <li>
            The voice service and model evaluation harness are still being
            completed. No evaluation scores are claimed here.
          </li>
          <li>
            This is a hackathon build and not legal advice. Sample cases are
            fictional.
          </li>
        </ul>
        <a
          className="prose-link text-sm"
          href="https://github.com/harshkawatra11/nivaran"
          target="_blank"
          rel="noreferrer"
        >
          Inspect the source code ↗
        </a>
      </section>
    </AppShell>
  );
}
