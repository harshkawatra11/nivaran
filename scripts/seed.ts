import { db } from "../src/lib/db";
import { getPack } from "../src/lib/packs/index";
import { resolveJurisdiction } from "../src/lib/jurisdiction";
import { geohash } from "../src/lib/geohash";
import { recluster } from "../src/lib/cluster";
import { advance, type LadderCase } from "../src/lib/ladder/advance";
import { renderTemplate } from "../src/lib/ladder/templates";
import { refreshClusterBrief } from "../src/lib/nightly";
import type { GrievanceFacts } from "../src/lib/schemas";
const pack = getPack("in-dl");
const supa = db();
const now = new Date();
const sites = [
  {
    name: "Sangam Vihar",
    lat: 28.492,
    lng: 77.246,
    category: "water_supply",
    issue: "Community hand pump has stopped supplying water",
  },
  {
    name: "Govindpuri",
    lat: 28.535,
    lng: 77.263,
    category: "garbage_sanitation",
    issue: "Garbage has not been collected from the community collection point",
  },
  {
    name: "Rohini",
    lat: 28.734,
    lng: 77.107,
    category: "streetlight",
    issue: "Street lights along the residential lane are not working",
  },
  {
    name: "Najafgarh",
    lat: 28.611,
    lng: 76.983,
    category: "sewer_drainage",
    issue: "Overflowing drain is blocking access to homes",
  },
  {
    name: "Shahdara",
    lat: 28.673,
    lng: 77.289,
    category: "road_pothole",
    issue: "A damaged residential road needs repair",
  },
  {
    name: "Narela",
    lat: 28.852,
    lng: 77.093,
    category: "water_supply",
    issue: "Water supply is irregular in the residential block",
  },
];
async function main() {
  for (let i = 0; i < 60; i++) {
    const site = i < 17 ? sites[0] : sites[1 + (i % 5)];
    const id = `00000000-0026-4026-8026-${String(i + 1).padStart(12, "0")}`;
    const exists = await supa
      .from("cases")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (exists.error) throw exists.error;
    if (exists.data) {
      const docs = await supa
        .from("documents")
        .select("id")
        .eq("case_id", id)
        .limit(1);
      if (docs.data?.length) continue;
    }
    const daysAgo = i < 9 ? 20 + (i % 5) : 2 + (i % 5);
    const filed = new Date(now.getTime() - daysAgo * 86400000)
      .toISOString()
      .slice(0, 10);
    const created = `${filed}T09:00:00Z`;
    const facts: GrievanceFacts = {
      category: site.category as GrievanceFacts["category"],
      summary: `[Demo] ${site.issue}`,
      locationText: `Lane ${1 + (i % 4)}, near community hall, ${site.name}, Delhi`,
      locality: site.name,
      sinceText: `${daysAgo} days`,
      sinceDays: daysAgo,
      affectedEstimate: "Residents of the surrounding lanes",
      priorComplaints: [],
      hazards: [],
      roadWidthHint: ["road_pothole", "streetlight"].includes(site.category)
        ? "narrow"
        : "not_applicable",
      facilityOperatorHint: "not_applicable",
      language: "en",
      citizenAsk:
        "Please inspect the site, restore the service, and provide an action-taken report.",
    };
    const jurisdiction = resolveJurisdiction(pack, facts);
    const gh = geohash(site.lat, site.lng, 6);
    const state: LadderCase = {
      status: "filed",
      filed_at: filed,
      rti_filed_at: null,
      appeal_filed_at: null,
      life_or_liberty: false,
      slaDays: jurisdiction.slaDays ?? 7,
      deadlines: [],
    };
    const deadlineRows: Record<string, unknown>[] = [];
    for (let round = 0; round < 5; round++) {
      const actions = advance(state, pack, now);
      if (!actions.length) break;
      for (const a of actions) {
        if (a.kind === "set_status") state.status = a.status;
        else if (a.kind === "add_deadline") {
          state.deadlines.push({
            step: a.step,
            due_on: a.dueOn,
            status: "pending",
          });
          deadlineRows.push({
            case_id: id,
            step: a.step,
            label: a.label,
            basis:
              a.basis === "slaBasis"
                ? (jurisdiction.slaBasis ?? "Department norm (source pending)")
                : a.basis,
            starts_on: a.startsOn,
            due_on: a.dueOn,
            status: "pending",
          });
        } else if (a.kind === "miss_deadline") {
          const d = state.deadlines.find((d) => d.step === a.step);
          if (d) d.status = "missed";
          const r = deadlineRows.find((d) => d.step === a.step);
          if (r) r.status = "missed";
        }
      }
    }
    const result = await supa.from("cases").upsert({
      id,
      pack: "in-dl",
      is_demo_seed: true,
      citizen_text: `FICTIONAL DEMO REPORT. ${site.issue}.`,
      status: state.status,
      category: site.category,
      language: "en",
      location_text: facts.locationText,
      lat: site.lat,
      lng: site.lng,
      geohash6: gh,
      facts,
      jurisdiction,
      filed_at: filed,
      portal_ref: `DEMO/${i + 1}`,
      created_at: created,
    });
    if (result.error) throw result.error;
    if (deadlineRows.length) {
      const r = await supa.from("deadlines").insert(deadlineRows);
      if (r.error) throw r.error;
    }
    if (jurisdiction.authority) {
      const letter = renderTemplate("grievance", {
        applicantName: "Demo citizen",
        authority: jurisdiction.authority,
        subject: facts.summary,
        factsParagraph: `FICTIONAL SAMPLE — NOT FOR FILING. ${site.issue} near the community hall in ${site.name}.`,
        requestedActions: [facts.citizenAsk],
      });
      const r = await supa.from("documents").insert({
        case_id: id,
        kind: "grievance",
        title: letter.title,
        body: letter.body,
        status: "filed",
      });
      if (r.error) throw r.error;
    }
  }
  console.log("60 synthetic cases ensured; no existing reports deleted.");
  console.log(
    await recluster(
      "in-dl",
      pack.systemicThreshold.windowDays,
      pack.systemicThreshold,
    ),
  );
  if (process.argv.includes("--briefs")) {
    const { data, error } = await supa
      .from("clusters")
      .select("id")
      .eq("status", "systemic");
    if (error) throw error;
    for (const c of data ?? []) {
      await refreshClusterBrief(c.id);
      console.log(`Real Nemotron Ultra brief generated: ${c.id}`);
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
