// Tavily search/extract with a Supabase-backed cache, so repeated research for the same
// office/area during a demo or eval run doesn't burn the free-tier quota.
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export interface WebResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
}

async function cached<T>(key: string, ttlHours: number, fn: () => Promise<T>): Promise<T> {
  const k = createHash("sha256").update(key).digest("hex");
  const { data } = await db().from("web_cache").select("payload, at").eq("key", k).maybeSingle();
  if (data && Date.now() - new Date(data.at).getTime() < ttlHours * 3600_000) return data.payload as T;
  const fresh = await fn();
  await db().from("web_cache").upsert({ key: k, payload: fresh as any, at: new Date().toISOString() });
  return fresh;
}

export async function tavilySearch(q: {
  query: string;
  includeDomains?: string[];
  maxResults?: number;
  topic?: "general" | "news";
  timeRange?: "week" | "month" | "year";
  depth?: "basic" | "advanced";
}): Promise<WebResult[]> {
  return cached(`s:${JSON.stringify(q)}`, 24, async () => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.tavilyKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q.query,
        search_depth: q.depth ?? "basic",
        max_results: q.maxResults ?? 5,
        include_domains: q.includeDomains,
        topic: q.topic ?? "general",
        time_range: q.timeRange,
        include_answer: false,
      }),
    });
    if (!res.ok) throw new Error(`Tavily search ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({
      url: r.url,
      title: r.title,
      content: String(r.content ?? "").slice(0, 1200),
      score: r.score,
      publishedDate: r.published_date,
    }));
  });
}

export async function tavilyExtract(urls: string[]): Promise<{ url: string; text: string }[]> {
  return cached(`e:${urls.join("|")}`, 72, async () => {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.tavilyKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) throw new Error(`Tavily extract ${res.status}`);
    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({ url: r.url, text: String(r.raw_content ?? "").slice(0, 6000) }));
  });
}

export const OFFICIAL_DOMAINS = [
  "gov.in",
  "nic.in",
  "delhi.gov.in",
  "mcdonline.nic.in",
  "djb.delhi.gov.in",
  "pgportal.gov.in",
  "rtionline.gov.in",
  "cic.gov.in",
  "indiacode.nic.in",
  "dslsa.org",
];
export const NEWS_DOMAINS = [
  "thehindu.com",
  "indianexpress.com",
  "hindustantimes.com",
  "timesofindia.indiatimes.com",
  "downtoearth.org.in",
  "newslaundry.com",
];
