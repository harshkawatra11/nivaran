"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { AppShell, PageIntro, Notice, Status } from "@/components/AppShell";
import { api } from "@/lib/browser-api";
import type { BoardData } from "@/lib/board-types";
const WardMap = dynamic(() => import("@/components/WardMap"), {
  ssr: false,
  loading: () => <div className="skeleton" aria-label="Loading locality map" />,
});
export default function Board() {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [authority, setAuthority] = useState("");
  async function load() {
    setError("");
    try {
      setData(await api<BoardData>("/api/board"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  const clusters =
    data?.clusters.filter((c) => !category || c.category === category) ?? [];
  return (
    <AppShell>
      <PageIntro eyebrow="A SHARED RECORD" title="The ward board.">
        When the same problem keeps returning, individual reports become a
        pattern. See which services and localities need follow-through.
      </PageIntro>
      <Notice>
        Demo reports are synthetic and marked as samples. Board totals may also
        include citizen reports from this deployment. Individual evidence stays
        in the case file.
      </Notice>
      {error && (
        <Notice error>
          {error}{" "}
          <button className="subtle-button" onClick={load}>
            Try again
          </button>
        </Notice>
      )}
      {!data && !error ? (
        <div className="skeleton" />
      ) : (
        data && (
          <>
            <div className="metric-row">
              <div>
                <strong>
                  {data.scorecards.reduce((s, c) => s + c.open, 0)}
                </strong>
                <span>Open reports</span>
              </div>
              <div>
                <strong className="text-seal">
                  {data.scorecards.reduce((s, c) => s + c.overdue, 0)}
                </strong>
                <span>Beyond the initial deadline</span>
              </div>
              <div>
                <strong>
                  {data.clusters.filter((c) => c.status === "systemic").length}
                </strong>
                <span>Systemic clusters</span>
              </div>
            </div>
            <div className="filter-row">
              <label htmlFor="category">Problem type</label>
              <select
                className="filter-input"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {[...new Set(data.clusters.map((c) => c.category))].map((c) => (
                  <option key={c} value={c}>
                    {c.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="map-frame">
              <WardMap clusters={clusters} />
            </div>
            <p className="help mb-7">
              Map markers represent approximate locality cells, not individual
              addresses. Red: systemic cluster. Ochre: watching.
            </p>
            <section className="panel">
              <h2>Repeated problems</h2>
              {clusters.length === 0 ? (
                <div className="empty-state">
                  <h2>No matching clusters yet.</h2>
                  <p>
                    Reports need a locality and enough nearby cases before a
                    shared pattern emerges.
                  </p>
                  <Link className="btn btn-secondary" href="/report">
                    Add a report <ArrowUpRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Locality / issue</th>
                        <th>Reports</th>
                        <th>Overdue</th>
                        <th>Pattern</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link href={`/cluster/${c.id}`}>
                              {c.locality ?? c.geohash6}
                            </Link>
                            <p className="help">
                              {c.category.replaceAll("_", " ")}
                            </p>
                          </td>
                          <td>{c.case_count}</td>
                          <td className="text-seal">{c.overdue_count}</td>
                          <td>
                            <Status value={c.status} />
                          </td>
                          <td>
                            <Link
                              href={`/cluster/${c.id}`}
                              aria-label={`View ${c.locality ?? c.geohash6}`}
                            >
                              <ArrowUpRight size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Department follow-through</h2>
              <label className="field">
                <span>Filter department</span>
                <select
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                >
                  <option value="">All departments</option>
                  {data.scorecards.map((c) => (
                    <option key={c.authorityId} value={c.authorityId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {data.scorecards.length === 0 ? (
                <p className="help">
                  Department totals appear after reports are assigned to an
                  office.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Open</th>
                        <th>Overdue</th>
                        <th>Median days open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.scorecards
                        .filter(
                          (c) => !authority || authority === c.authorityId,
                        )
                        .map((c) => (
                          <tr key={c.authorityId}>
                            <td>{c.name}</td>
                            <td>{c.open}</td>
                            <td className="text-seal">{c.overdue}</td>
                            <td>{c.medianDaysOpen}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </AppShell>
  );
}
