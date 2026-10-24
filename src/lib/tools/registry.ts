import { z } from "zod";
import type { AgentTool } from "@/lib/llm/agent";
import { tavilySearch, tavilyExtract, OFFICIAL_DOMAINS, NEWS_DOMAINS } from "@/lib/tools/tavily";

const SearchArgs = z.object({ query: z.string().min(3).max(200) });
const ExtractArgs = z.object({ urls: z.array(z.string()).min(1).max(2) });

export function researchTools(): AgentTool[] {
  const webSearchOfficial: AgentTool<typeof SearchArgs> = {
    name: "web_search_official",
    description:
      "Search official Indian government websites (gov.in, nic.in, Delhi govt, MCD, DJB, CPGRAMS). Use for grievance channels, officer designations, notices, citizen charters.",
    args: SearchArgs,
    run: async ({ query }, ctx) => {
      const r = await tavilySearch({ query, includeDomains: OFFICIAL_DOMAINS, maxResults: 5 });
      r.forEach((x) => ctx.fetchedUrls.add(x.url));
      return r.map((x) => ({ url: x.url, title: x.title, snippet: x.content.slice(0, 600), published: x.publishedDate ?? null }));
    },
  };
  const webSearchNews: AgentTool<typeof SearchArgs> = {
    name: "web_search_news",
    description: "Search recent Indian news for reports of the same problem in the same area (last year).",
    args: SearchArgs,
    run: async ({ query }, ctx) => {
      const r = await tavilySearch({ query, includeDomains: NEWS_DOMAINS, topic: "news", timeRange: "year", maxResults: 5 });
      r.forEach((x) => ctx.fetchedUrls.add(x.url));
      return r.map((x) => ({ url: x.url, title: x.title, snippet: x.content.slice(0, 400), published: x.publishedDate ?? null }));
    },
  };
  const extractPage: AgentTool<typeof ExtractArgs> = {
    name: "extract_page",
    description: "Read the main text of up to 2 URLs previously returned by a search tool.",
    args: ExtractArgs,
    run: async ({ urls }, ctx) => {
      const allowed = urls.filter((u: string) => ctx.fetchedUrls.has(u));
      if (!allowed.length) return { error: "Only URLs returned by a search tool can be extracted." };
      const r = await tavilyExtract(allowed);
      return r.map((x) => ({ url: x.url, text: x.text.slice(0, 4000) }));
    },
  };
  return [webSearchOfficial, webSearchNews, extractPage];
}
