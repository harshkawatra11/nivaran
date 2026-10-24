import { describe, it, expect } from "vitest";
import { advance, type LadderCase } from "@/lib/ladder/advance";
import { getPack } from "@/lib/packs/index";

const pack = getPack("in-dl");
const base = (overrides: Partial<LadderCase> = {}): LadderCase => ({
  status: "filed",
  filed_at: "2026-10-01",
  rti_filed_at: null,
  appeal_filed_at: null,
  life_or_liberty: false,
  slaDays: 7,
  deadlines: [],
  ...overrides,
});

describe("ladder advance()", () => {
  it("adds the SLA deadline when filed with none yet", () => {
    const actions = advance(base(), pack, new Date("2026-10-02T00:00:00Z"));
    expect(actions).toEqual([{ kind: "add_deadline", step: "grievance_sla", label: "Department must act", basis: "slaBasis", startsOn: "2026-10-01", dueOn: "2026-10-08" }]);
  });

  it("does nothing while the SLA has not passed", () => {
    const c = base({ deadlines: [{ step: "grievance_sla", due_on: "2026-10-08", status: "pending" }] });
    expect(advance(c, pack, new Date("2026-10-05T00:00:00Z"))).toEqual([]);
  });

  it("goes overdue and drafts a reminder once the SLA passes", () => {
    const c = base({ deadlines: [{ step: "grievance_sla", due_on: "2026-10-08", status: "pending" }] });
    const actions = advance(c, pack, new Date("2026-10-09T00:00:00Z"));
    expect(actions.map((a) => a.kind)).toEqual(["miss_deadline", "set_status", "draft", "add_deadline", "event"]);
    expect(actions.find((a) => a.kind === "set_status")).toMatchObject({ status: "overdue" });
    expect(actions.find((a) => a.kind === "draft")).toMatchObject({ doc: "reminder" });
  });

  it("moves to RTI ready once the reminder grace period passes", () => {
    const c = base({
      status: "overdue",
      deadlines: [
        { step: "grievance_sla", due_on: "2026-10-08", status: "missed" },
        { step: "reminder_grace", due_on: "2026-10-15", status: "pending" },
      ],
    });
    const actions = advance(c, pack, new Date("2026-10-16T00:00:00Z"));
    expect(actions.find((a) => a.kind === "set_status")).toMatchObject({ status: "rti_ready" });
    expect(actions.find((a) => a.kind === "draft")).toMatchObject({ doc: "rti" });
  });

  it("uses a 48-hour window for life-or-liberty cases", () => {
    const c = base({ status: "rti_filed", rti_filed_at: "2026-10-01", life_or_liberty: true, deadlines: [] });
    const actions = advance(c, pack, new Date("2026-10-02T00:00:00Z"));
    const added = actions.find((a) => a.kind === "add_deadline" && a.step === "rti_response");
    expect(added).toMatchObject({ dueOn: "2026-10-03", basis: "RTI Act s.7(1) proviso" });
  });

  it("uses the 30-day window for ordinary RTI cases", () => {
    const c = base({ status: "rti_filed", rti_filed_at: "2026-10-01", deadlines: [] });
    const actions = advance(c, pack, new Date("2026-10-02T00:00:00Z"));
    const added = actions.find((a) => a.kind === "add_deadline" && a.step === "rti_response");
    expect(added).toMatchObject({ dueOn: "2026-10-31" });
  });

  it("drafts the First Appeal with a 30-day filing window when RTI is missed", () => {
    const c = base({ status: "rti_filed", rti_filed_at: "2026-09-01", deadlines: [{ step: "rti_response", due_on: "2026-10-01", status: "pending" }] });
    const actions = advance(c, pack, new Date("2026-10-02T00:00:00Z"));
    expect(actions.find((a) => a.kind === "set_status")).toMatchObject({ status: "appeal_ready" });
    expect(actions.find((a) => a.kind === "draft")).toMatchObject({ doc: "first_appeal" });
    const window = actions.find((a) => a.kind === "add_deadline" && a.step === "first_appeal_window");
    expect(window).toMatchObject({ dueOn: "2026-10-31", basis: "RTI Act s.19(1)" });
  });

  it("drafts the Second Appeal with a 90-day window when the appeal disposal is missed", () => {
    const c = base({ status: "appeal_filed", appeal_filed_at: "2026-09-01", deadlines: [{ step: "first_appeal_disposal", due_on: "2026-10-01", status: "pending" }] });
    const actions = advance(c, pack, new Date("2026-10-02T00:00:00Z"));
    expect(actions.find((a) => a.kind === "set_status")).toMatchObject({ status: "second_appeal_ready" });
    expect(actions.find((a) => a.kind === "draft")).toMatchObject({ doc: "second_appeal" });
    const window = actions.find((a) => a.kind === "add_deadline" && a.step === "second_appeal_window");
    expect(window).toMatchObject({ dueOn: "2026-12-30", basis: "RTI Act s.19(3)" });
  });

  it("is idempotent: re-running after the deadline is already marked missed returns no transition", () => {
    const c = base({ status: "overdue", deadlines: [{ step: "grievance_sla", due_on: "2026-10-08", status: "missed" }] });
    const actions = advance(c, pack, new Date("2026-10-09T00:00:00Z"));
    expect(actions).toEqual([]);
  });

  it("stops producing actions once a case is resolved", () => {
    const c = base({ status: "resolved", deadlines: [{ step: "grievance_sla", due_on: "2026-10-08", status: "missed" }] });
    expect(advance(c, pack, new Date("2026-12-01T00:00:00Z"))).toEqual([]);
  });

  it("supports walking through multiple transitions via repeated application (simulated loop)", () => {
    let c = base({ deadlines: [] });
    const now = new Date("2026-12-01T00:00:00Z");
    // Simulate apply.ts's loop: apply actions in-memory, call advance again, up to 5 times.
    for (let i = 0; i < 5; i++) {
      const actions = advance(c, pack, now);
      if (actions.length === 0) break;
      for (const a of actions) {
        if (a.kind === "add_deadline") c.deadlines.push({ step: a.step, due_on: a.dueOn, status: "pending" });
        if (a.kind === "miss_deadline") {
          const d = c.deadlines.find((x) => x.step === a.step);
          if (d) d.status = "missed";
        }
        if (a.kind === "set_status") c.status = a.status;
      }
    }
    expect(c.status).toBe("rti_ready");
  });

  it("does not add a second SLA deadline once one already exists", () => {
    const c = base({ deadlines: [{ step: "grievance_sla", due_on: "2026-10-08", status: "pending" }] });
    const actions = advance(c, pack, new Date("2026-10-02T00:00:00Z"));
    expect(actions.filter((a) => a.kind === "add_deadline" && a.step === "grievance_sla")).toHaveLength(0);
  });
});
