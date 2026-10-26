"use client";
import { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Check, Download, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { AppShell, PageIntro, Notice, Status } from "@/components/AppShell";
import { Seal } from "@/components/Seal";
import { ModelChip } from "@/components/ModelChip";
import { api, post } from "@/lib/browser-api";
import { readEvents, type StreamEvent } from "@/lib/stream";
import type {
  GrievanceFacts,
  ResearchNotes,
  EvidenceFindings,
} from "@/lib/schemas";
import type { JurisdictionDecision } from "@/lib/jurisdiction";
import type { ModelKey } from "@/lib/llm/models";
const stages = [
  ["perceive", "Reading the evidence", "superVL"],
  ["understand", "Understanding your report", "lightning"],
  ["triage", "Checking safety and details", "code"],
  ["decide", "Finding the responsible office", "code"],
  ["research", "Checking official sources", "super"],
  ["draft", "Drafting your complaint", "super"],
  ["bench", "Reviewing the draft", "ultra"],
  ["package", "Preparing the packet", "code"],
] as const;
type Doc = {
  id: string;
  kind: string;
  title: string;
  body: string;
  body_hi?: string | null;
  status: string;
};
type Snapshot = {
  case: {
    id: string;
    status: string;
    citizen_text: string;
    location_text: string;
    facts: GrievanceFacts | null;
    jurisdiction: JurisdictionDecision | null;
    research: ResearchNotes | null;
    evidence_findings: EvidenceFindings | null;
    followup_questions:
      { field: string; question: string; questionHi: string }[] | null;
    triage: { emergency: { reason: string; call: string } | null } | null;
    filed_at: string | null;
    portal_ref: string | null;
    bench:
      | {
          round: number;
          verdict: string;
          risks: { issue: string; severity: string; fix: string }[];
        }[]
      | null;
  };
  evidence: { id: string; url: string | null; sha256: string }[];
  documents: Doc[];
  deadlines: {
    id: string;
    step: string;
    label: string;
    basis: string;
    source_url: string | null;
    due_on: string;
    status: string;
  }[];
  events: StreamEvent[];
  ledger: {
    totalUsd: number;
    totalMs: number;
    calls: {
      step: string;
      model_key: ModelKey;
      latency_ms: number;
      cost_usd: number;
      ok: boolean;
    }[];
  };
  readOnly: boolean;
};
function safeUrl(value: string | null | undefined) {
  return value && /^https?:\/\//i.test(value) ? value : undefined;
}
export default function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [activeDoc, setActiveDoc] = useState("");
  const [hindi, setHindi] = useState(false);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [started, setStarted] = useState(false);
  const [clock, setClock] = useState(0);
  const [reply, setReply] = useState<File | null>(null);
  const [ack, setAck] = useState<File | null>(null);
  const guard = useRef(false);
  const load = useCallback(async () => {
    const fresh = await api<Snapshot>(`/api/cases/${id}`);
    setData(fresh);
    setEvents(fresh.events);
    return fresh;
  }, [id]);
  const run = useCallback(async () => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setStarted(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/cases/${id}/run`, { method: "POST" });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not start the pipeline.");
      }
      await readEvents(response.body, (event) => {
        setEvents((prev) => [...prev, event]);
        if (event.type === "error")
          setError(String(event.payload.message ?? "Processing failed."));
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }, [id, load]);
  useEffect(() => {
    let active = true;
    api<Snapshot>(`/api/cases/${id}`)
      .then((fresh) => {
        if (!active) return;
        setData(fresh);
        setEvents(fresh.events);
        if (new URLSearchParams(window.location.search).get("run") === "1") {
          window.history.replaceState(null, "", `/case/${id}`);
          if (fresh.case.status === "intake") void run();
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id, run]); // run is guarded against duplicate starts
  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadSampleDocument(kind: "ack" | "reply") {
    try {
      const response = await fetch(`/demo/docs/${kind}-sample.png`);
      if (!response.ok) throw new Error("Sample document is unavailable.");
      const file = new File([await response.blob()], `${kind}-sample.png`, {
        type: "image/png",
      });
      if (kind === "ack") setAck(file);
      else setReply(file);
      setMessage(
        "Fictional sample attached. Submit the form below to run real vision analysis.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const c = data?.case;
  const doc =
    data?.documents.find((d) => d.id === activeDoc) ?? data?.documents[0];
  const editable = data && !data.readOnly;
  const authority = c?.jurisdiction?.authority;
  return (
    <AppShell>
      <Link href="/cases" className="text-link mb-7">
        ← My cases
      </Link>
      {!data && !error ? (
        <>
          <div className="skeleton mb-6" />
          <div className="skeleton" />
        </>
      ) : null}
      {error && (
        <Notice error>
          {error}{" "}
          <button
            className="subtle-button"
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Refresh case
          </button>
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
      {data && c && (
        <>
          <div className="case-header">
            <span className="eyebrow">
              CASE / {id.slice(0, 8).toUpperCase()}
            </span>
            <Status value={busy && started ? "processing" : c.status} />
          </div>
          <PageIntro
            eyebrow={c.location_text ?? "DELHI CIVIC SERVICES"}
            title={c.facts?.summary ?? "Your report is on record."}
          >
            <p>{c.facts ? c.facts.citizenAsk : c.citizen_text}</p>
          </PageIntro>
          {data.readOnly && (
            <Notice>
              This is a public sample case. Filing and other changes are
              available only for your own reports.
            </Notice>
          )}
          {c.status === "emergency" && (
            <Notice error>
              <strong>Urgent danger detected.</strong>{" "}
              {c.triage?.emergency?.reason?.replaceAll("_", " ")} · Call{" "}
              <a
                className="prose-link"
                href={`tel:${c.triage?.emergency?.call ?? "112"}`}
              >
                {c.triage?.emergency?.call ?? "112"}
              </a>{" "}
              for immediate help. This complaint process cannot provide
              emergency assistance.
            </Notice>
          )}
          <div className="workspace-grid">
            <div>
              {c.status === "needs_input" && editable && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await post(`/api/cases/${id}/answer`, { answers });
                    }, "Answers saved. Continue processing below.");
                  }}
                >
                  <h2>A little more detail.</h2>
                  {c.followup_questions?.map((q) => (
                    <label className="field" key={q.field}>
                      <span>{q.question}</span>
                      <small lang="hi">{q.questionHi}</small>
                      {q.field === "road_width" ? (
                        <select
                          required
                          value={answers[q.field] ?? ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [q.field]: e.target.value,
                            })
                          }
                        >
                          <option value="">Choose road width</option>
                          <option value="wide">60 feet or wider</option>
                          <option value="narrow">Less than 60 feet</option>
                        </select>
                      ) : q.field === "facility_operator" ? (
                        <select
                          required
                          value={answers[q.field] ?? ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [q.field]: e.target.value,
                            })
                          }
                        >
                          <option value="">Choose operator</option>
                          <option value="delhi_govt">Delhi government</option>
                          <option value="mcd">
                            Municipal Corporation of Delhi
                          </option>
                        </select>
                      ) : (
                        <input
                          required
                          value={answers[q.field] ?? ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [q.field]: e.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                  <button disabled={busy} className="btn btn-primary">
                    Save details <ArrowRight size={16} />
                  </button>
                </form>
              )}
              {authority && (
                <section className="panel">
                  <div className="actions mb-4">
                    <Seal kind="code" />
                    <Seal
                      kind={c.jurisdiction?.verified ? "verified" : "pending"}
                    />
                  </div>
                  <h2>{authority.name}</h2>
                  <p className="aside-note">{c.jurisdiction?.explanation}</p>
                  <p className="help">
                    {c.jurisdiction?.slaDays} days · {c.jurisdiction?.slaBasis}
                  </p>
                  {safeUrl(authority.sourceUrl) && (
                    <a
                      className="prose-link text-xs"
                      href={safeUrl(authority.sourceUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Authority source ↗
                    </a>
                  )}
                </section>
              )}
              {c.research && (
                <section className="panel">
                  <h2>Official channel check</h2>
                  <Status value={c.research.channelConfirmed.status} />
                  <p className="aside-note mt-4">
                    {c.research.channelConfirmed.note}
                  </p>
                  {c.research.citations.length > 0 && (
                    <ul className="rule-list">
                      {c.research.citations.map((s, i) => (
                        <li key={i}>
                          {safeUrl(s.url) ? (
                            <a
                              href={safeUrl(s.url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.title}
                            </a>
                          ) : (
                            s.title
                          )}
                          <p className="help">{s.supports}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              {doc && (
                <section className="panel">
                  <div
                    className="actions mb-5"
                    style={{ justifyContent: "space-between" }}
                  >
                    <h2 style={{ margin: 0 }}>Your documents</h2>
                    <button
                      className="subtle-button"
                      onClick={() => {
                        setHindi(!hindi);
                      }}
                      disabled={!doc.body_hi}
                    >
                      {hindi ? "English" : "हिंदी"}
                    </button>
                  </div>
                  <div className="document-tabs">
                    {data.documents.map((d) => (
                      <button
                        key={d.id}
                        aria-pressed={doc.id === d.id}
                        onClick={() => {
                          setActiveDoc(d.id);
                          setHindi(false);
                        }}
                      >
                        {d.kind.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                  <h3>{doc.title}</h3>
                  <p className="document-text" lang={hindi ? "hi" : "en"}>
                    {hindi && doc.body_hi ? doc.body_hi : doc.body}
                  </p>
                  <div className="actions">
                    <a
                      className="btn btn-secondary"
                      href={`/api/cases/${id}/packet?doc=${doc.id}`}
                    >
                      <Download size={15} /> Download packet
                    </a>
                    <button
                      className="subtle-button"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(
                            hindi && doc.body_hi ? doc.body_hi : doc.body,
                          )
                          .then(() => setMessage("Document copied."))
                          .catch(() =>
                            setError(
                              "Could not copy. Select and copy the document text manually.",
                            ),
                          )
                      }
                    >
                      Copy text
                    </button>
                    {safeUrl(authority?.grievanceChannel.url) && (
                      <a
                        className="text-link"
                        href={safeUrl(authority?.grievanceChannel.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open filing channel ↗
                      </a>
                    )}
                  </div>
                  <p className="help">
                    Review the draft carefully. You submit it through the
                    official channel.
                  </p>
                </section>
              )}
              {c.bench && c.bench.length > 0 && (
                <section className="panel">
                  <h2>The review bench</h2>
                  <p className="help">
                    Nemotron Ultra checks the draft for rejection risks. A
                    review is not a guarantee of acceptance.
                  </p>
                  {c.bench.map((round) => (
                    <div className="mt-5" key={round.round}>
                      <Status value={round.verdict} />{" "}
                      <span className="help inline">Round {round.round}</span>
                      {round.risks.length > 0 ? (
                        <ul className="rule-list">
                          {round.risks.map((r, i) => (
                            <li key={i}>
                              <strong>{r.issue}</strong> · {r.severity}
                              <p>{r.fix}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="help">
                          No rejection risks flagged in this round.
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {data.evidence.length > 0 && (
                <details className="panel">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Evidence and provenance ({data.evidence.length})
                  </summary>
                  {data.evidence.map((e) => (
                    <div className="mt-5" key={e.id}>
                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="prose-link text-sm"
                        >
                          View evidence ↗
                        </a>
                      )}
                      <p className="help font-mono break-all">
                        SHA-256: {e.sha256}
                      </p>
                    </div>
                  ))}
                  {c.evidence_findings && (
                    <p className="aside-note">
                      {c.evidence_findings.issueSeen}
                    </p>
                  )}
                </details>
              )}
              {editable && c.status === "ready" && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      if (ack) {
                        const form = new FormData();
                        form.set("ack", ack);
                        const result = await api<{
                          needsConfirm?: boolean;
                          read?: {
                            registrationNumber: string;
                            filedDate: string;
                          };
                        }>(`/api/cases/${id}/filed`, {
                          method: "POST",
                          body: form,
                        });
                        if (result.needsConfirm) {
                          setRef(result.read?.registrationNumber ?? "");
                          setDate(result.read?.filedDate ?? date);
                          setAck(null);
                          throw new Error(
                            "Please confirm the registration number and date read from your receipt, then save again.",
                          );
                        }
                      } else
                        await post(`/api/cases/${id}/filed`, { ref, date });
                    }, "Filing recorded. Your case clock has started.");
                  }}
                >
                  <h2>Have you filed it?</h2>
                  <p className="aside-note">
                    Keep your acknowledgement. Record the receipt below to start
                    tracking the filing.
                  </p>
                  <label className="field">
                    <span>Registration number</span>
                    <input
                      value={ref}
                      required={!ack}
                      onChange={(e) => setRef(e.target.value)}
                      placeholder="Reference from the official portal"
                    />
                  </label>
                  <label className="field">
                    <span>Filing date</span>
                    <input
                      type="date"
                      required={!ack}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Or upload an acknowledgement</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => setAck(e.target.files?.[0] ?? null)}
                    />
                    <small>
                      JPG or PNG, up to 1.5 MB. The vision model reads the date
                      and registration number.
                    </small>
                  </label>
                  <button
                    type="button"
                    className="subtle-button mb-4"
                    onClick={() => loadSampleDocument("ack")}
                  >
                    Use sample acknowledgement (fictional)
                  </button>
                  <button className="btn btn-primary" disabled={busy}>
                    I’ve filed it <Check size={16} />
                  </button>
                </form>
              )}
              {editable &&
                ["rti_ready", "appeal_ready", "second_appeal_ready"].includes(
                  c.status,
                ) && (
                  <form
                    className="panel"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const step =
                        c.status === "rti_ready"
                          ? "rti"
                          : c.status === "appeal_ready"
                            ? "first_appeal"
                            : "second_appeal";
                      void act(
                        () =>
                          post(`/api/cases/${id}/step-filed`, { step, date }),
                        "Filing recorded. The next deadline is now tracked.",
                      );
                    }}
                  >
                    <h2>Record the next filing</h2>
                    <p className="help">
                      Submit the prepared document through the official channel
                      before recording it here.
                    </p>
                    <label className="field">
                      <span>Filing date</span>
                      <input
                        required
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <button disabled={busy} className="btn btn-primary">
                      {c.status === "rti_ready"
                        ? "I filed the RTI"
                        : "I filed the appeal"}
                    </button>
                  </form>
                )}
              {editable && c.filed_at && c.status !== "resolved" && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reply) return;
                    void act(async () => {
                      const form = new FormData();
                      form.set("reply", reply);
                      const result = await api<{ summary: string }>(
                        `/api/cases/${id}/reply`,
                        { method: "POST", body: form },
                      );
                      setReply(null);
                      return result;
                    }, "Reply reviewed. Check the timeline and any newly prepared documents.");
                  }}
                >
                  <h2>Received a reply?</h2>
                  <label className="field">
                    <span>Upload the official reply</span>
                    <input
                      required
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => setReply(e.target.files?.[0] ?? null)}
                    />
                    <small>
                      JPG or PNG, up to 1.5 MB. We read the reply and assess the
                      next step.
                    </small>
                  </label>
                  <button
                    disabled={busy || !reply}
                    className="btn btn-secondary"
                  >
                    Review the reply
                  </button>
                  <button
                    type="button"
                    className="subtle-button"
                    onClick={() => loadSampleDocument("reply")}
                  >
                    Use sample reply (fictional)
                  </button>
                </form>
              )}
            </div>
            <aside>
              <section className="panel">
                <h2>Your report’s journey</h2>
                <ol className="stage-list">
                  {stages.map(([sid, label, actor], i) => {
                    const event = [...events]
                      .reverse()
                      .find((e) => e.type === "stage" && e.payload.id === sid);
                    const state = event?.payload.state;
                    return (
                      <li key={sid}>
                        <span
                          className={`stage-dot ${state === "done" ? "stage-done" : state === "start" ? "stage-active" : ""}`}
                        >
                          {state === "done" ? (
                            <Check size={13} />
                          ) : state === "error" ? (
                            "!"
                          ) : (
                            i + 1
                          )}
                        </span>
                        <div>
                          <strong>{label}</strong>
                          <p>
                            {actor === "code"
                              ? "Deterministic code"
                              : actor === "superVL"
                                ? "Nemotron Super VL"
                                : `Nemotron ${actor}`}
                          </p>
                          {event?.payload.summary !== undefined && (
                            <p>{String(event.payload.summary)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {editable && ["intake", "failed"].includes(c.status) && (
                  <button
                    onClick={run}
                    disabled={busy}
                    className="btn btn-primary mt-5"
                  >
                    {busy
                      ? "Processing…"
                      : c.status === "failed"
                        ? "Retry processing"
                        : "Continue processing"}
                  </button>
                )}
                {c.status === "processing" && !busy && (
                  <Notice>
                    Processing may still be running.{" "}
                    <button
                      className="subtle-button"
                      onClick={() => load().catch((e) => setError(e.message))}
                    >
                      Check progress
                    </button>
                  </Notice>
                )}
              </section>
              <section className="panel">
                <Clock3 size={24} className="text-verdigris mb-4" />
                <h2>The case clock</h2>
                {c.filed_at ? (
                  <p className="help">
                    Filed {c.filed_at} ·{" "}
                    {c.portal_ref ?? "Reference not recorded"}
                  </p>
                ) : (
                  <p className="aside-note">
                    The clock starts when you record the official filing
                    receipt.
                  </p>
                )}
                {data.deadlines.map((d) => (
                  <div className="clock-rung" key={d.id}>
                    <div>
                      <strong>{d.label}</strong>
                      <small>
                        Due {d.due_on} · {d.basis}
                      </small>
                      {safeUrl(d.source_url) && (
                        <a
                          className="help prose-link"
                          href={safeUrl(d.source_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                    <Status value={d.status} />
                  </div>
                ))}
              </section>
              <details className="panel">
                <summary className="cursor-pointer text-sm font-semibold">
                  Model ledger · ${Number(data.ledger.totalUsd).toFixed(4)}
                </summary>
                <p className="help">
                  Actual recorded model calls for this case.
                </p>
                {data.ledger.calls.map((call, i) => (
                  <div className="mt-4" key={i}>
                    <ModelChip model={call.model_key} />
                    <p className="help">
                      {call.step} · {(call.latency_ms / 1000).toFixed(1)}s · $
                      {Number(call.cost_usd).toFixed(4)} ·{" "}
                      {call.ok ? "OK" : "Failed"}
                    </p>
                  </div>
                ))}
                {data.ledger.calls.length === 0 && (
                  <p className="help">No model calls recorded yet.</p>
                )}
              </details>
              {editable && process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
                <section className="panel">
                  <h3>Time travel · demo</h3>
                  <p className="help">
                    Advances this browser’s case clocks and runs the escalation
                    rules. Offset this visit: {clock} days.
                  </p>
                  <div className="actions">
                    {[7, 30].map((days) => (
                      <button
                        key={days}
                        disabled={busy}
                        className="btn btn-secondary"
                        onClick={() =>
                          act(async () => {
                            const r = await post<{
                              offset: number;
                              now: string;
                            }>("/api/demo/clock", { days });
                            setClock(r.offset);
                            setDate(r.now.slice(0, 10));
                          }, "Demo clock advanced. Check deadlines and documents.")
                        }
                      >
                        +{days}d
                      </button>
                    ))}
                    <button
                      className="subtle-button"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await post("/api/demo/clock", { reset: true });
                          setClock(0);
                          setDate(new Date().toISOString().slice(0, 10));
                        }, "Clock offset reset. Existing documents and filing records remain.")
                      }
                    >
                      Reset offset
                    </button>
                  </div>
                </section>
              )}
              <p className="help">
                <ShieldCheck size={14} className="inline" /> Nothing is
                automatically submitted to a government office. Review and file
                every document yourself.
              </p>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
