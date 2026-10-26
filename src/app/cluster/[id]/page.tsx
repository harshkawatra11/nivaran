"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell, PageIntro, Notice, Status } from "@/components/AppShell";
import { api } from "@/lib/browser-api";
import type { ClusterRow } from "@/lib/board-types";
type Data = {
  cluster: ClusterRow;
  members: { id: string; status: string; summary: string; createdAt: string }[];
  documents: { id: string; title: string; body: string }[];
};
export default function Cluster({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Data>(`/api/clusters/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  const brief = data?.cluster.brief;
  return (
    <AppShell>
      <Link className="text-link mb-7" href="/board">
        ← Ward board
      </Link>
      {error && <Notice error>{error}</Notice>}
      {!data && !error && <div className="skeleton" />}
      {data && (
        <>
          <PageIntro
            eyebrow={`${data.cluster.locality ?? "DELHI"} / ${data.cluster.category.replaceAll("_", " ")}`}
            title={brief?.headline ?? "One locality. A shared problem."}
          >
            {data.cluster.case_count} related reports ·{" "}
            {data.cluster.overdue_count} beyond their initial deadlines.
          </PageIntro>
          <Notice>
            This cluster may include synthetic demo reports. It shows an
            area-level pattern, not proof of misconduct or a legal finding.
          </Notice>
          <div className="workspace-grid">
            <div>
              <section className="panel">
                <h2>The pattern</h2>
                {brief ? (
                  <>
                    <p className="aside-note">{brief.pattern}</p>
                    <h3>What residents are asking for</h3>
                    <ul className="rule-list">
                      {brief.systemicAsk.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                    <h3>Timeline</h3>
                    <ul className="rule-list">
                      {brief.timeline.map((t, i) => (
                        <li key={i}>
                          <strong>{t.date}</strong> · {t.event}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="aside-note">
                    A model-written brief has not been generated for this
                    cluster yet. Related reports are available below; the
                    nightly job can prepare a brief after model credentials are
                    configured.
                  </p>
                )}
              </section>
              {data.documents.map((d) => (
                <section className="panel" key={d.id}>
                  <h2>{d.title}</h2>
                  <p className="document-text">{d.body}</p>
                  <a
                    className="btn btn-secondary"
                    href={`/api/clusters/${id}/packet`}
                  >
                    <Download size={15} /> Download collective packet
                  </a>
                </section>
              ))}
              <section className="panel">
                <h2>Related reports</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Case</th>
                        <th>Summary</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.members.map((m) => (
                        <tr key={m.id}>
                          <td className="font-mono">{m.id.slice(0, 8)}</td>
                          <td>{m.summary || "Summary pending"}</td>
                          <td>
                            <Status value={m.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <aside>
              <section className="panel">
                <h2>Where this can go</h2>
                {brief?.forums.map((f, i) => (
                  <div key={i}>
                    <h3>{f.name}</h3>
                    <p className="help">{f.why}</p>
                  </div>
                ))}
                {!brief && (
                  <p className="help">
                    Forum suggestions appear after the systemic brief is
                    generated and reviewed.
                  </p>
                )}
                <h3>Read with care</h3>
                <ul className="rule-list">
                  {(
                    brief?.caveats ?? [
                      "Reports need independent verification. A cluster does not establish legal liability.",
                    ]
                  ).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="help">
                  Nivaran prepares a record for citizens and legal-aid
                  volunteers. It does not file court proceedings.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
