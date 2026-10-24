// Typed, validated access to process.env. Read at call time (not module load) so the
// deployment's env is already populated when these are evaluated.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  nebiusKey: () => req("NEBIUS_API_KEY"),
  nebiusBase: () => (process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, ""),
  tavilyKey: () => req("TAVILY_API_KEY"),
  supabaseUrl: () => req("SUPABASE_URL"),
  supabaseKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  cronSecret: () => process.env.CRON_SECRET ?? "",
  thinkingKwarg: () => (process.env.NV_THINKING_KWARG ?? "on") === "on",
  jsonMode: () => (process.env.NV_JSON_MODE ?? "schema") as "schema" | "object" | "prompt",
  jsonStrict: () => process.env.NV_JSON_STRICT === "true",
  demoMode: () => process.env.NEXT_PUBLIC_DEMO_MODE === "1",
  voiceServiceToken: () => process.env.VOICE_SERVICE_TOKEN ?? "",
  voiceTicketSecret: () => req("VOICE_TICKET_SECRET"),
};
