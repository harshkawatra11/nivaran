"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { AppShell, PageIntro, Notice, Status } from "@/components/AppShell";
import { api } from "@/lib/browser-api";
type Row = {
  id: string;
  status: string;
  citizen_text: string;
  category: string | null;
  created_at: string;
};
export default function Cases() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  async function load() {
    setError("");
    try {
      setRows((await api<{ cases: Row[] }>("/api/cases")).cases);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  const shown = rows?.filter((r) =>
    `${r.citizen_text} ${r.status} ${r.category}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <AppShell>
      <PageIntro eyebrow="YOUR PAPER TRAIL" title="My cases.">
        Every report, document, and next step in one place. Cases here belong to
        this browser.
      </PageIntro>
      <div className="actions mb-6">
        <Link href="/report" className="btn btn-primary">
          New report <ArrowRight size={16} />
        </Link>
        <button onClick={load} className="subtle-button">
          Refresh cases
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {!rows && !error ? (
        <div className="skeleton" aria-label="Loading cases" />
      ) : rows?.length === 0 ? (
        <div className="panel empty-state">
          <FolderOpen size={34} className="mx-auto text-verdigris mb-5" />
          <h2>Your first report starts here.</h2>
          <p>
            A photo and a few sentences are enough. We’ll help turn them into a
            clear complaint.
          </p>
          <Link className="btn btn-secondary" href="/report?example=meena">
            Try Meena’s sample case <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        rows && (
          <>
            <label className="field">
              <span>Find a case</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search your reports or status"
              />
            </label>
            {shown?.length === 0 ? (
              <Notice>No cases match your search.</Notice>
            ) : (
              <div className="panel table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown?.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/case/${r.id}`}>
                            {r.citizen_text.slice(0, 110)}
                            {r.citizen_text.length > 110 ? "…" : ""}
                          </Link>
                          <div className="help">
                            {r.category?.replaceAll("_", " ") ??
                              "Awaiting classification"}
                          </div>
                        </td>
                        <td>
                          <Status value={r.status} />
                        </td>
                        <td className="whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td>
                          <Link
                            href={`/case/${r.id}`}
                            aria-label={`Open case ${r.id.slice(0, 8)}`}
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </AppShell>
  );
}
