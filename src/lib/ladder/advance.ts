// The escalation ladder state machine. Pure function: given a case's current state, the
// jurisdiction pack, and "now", return the actions that should happen. Idempotent: applying
// the returned actions and calling advance() again returns []. The DB wrapper (apply.ts)
// loops this up to 5 times so a multi-day clock jump can walk through several transitions
// in one sweep.
import type { Pack } from "@/lib/packs/types";
import { addDays, isPast, isoDate } from "@/lib/clock";

export interface LadderCase {
  status: string;
  filed_at: string | null;
  rti_filed_at: string | null;
  appeal_filed_at: string | null;
  life_or_liberty: boolean;
  slaDays: number;
  deadlines: Array<{ step: string; due_on: string; status: "pending" | "met" | "missed" }>;
}

export type LadderAction =
  | { kind: "add_deadline"; step: string; label: string; basis: string; startsOn: string; dueOn: string }
  | { kind: "miss_deadline"; step: string }
  | { kind: "set_status"; status: string }
  | { kind: "draft"; doc: "reminder" | "rti" | "first_appeal" | "second_appeal" }
  | { kind: "event"; type: string; payload: Record<string, unknown> };

export function advance(c: LadderCase, pack: Pack, now: Date): LadderAction[] {
  const A: LadderAction[] = [];
  const dl = (s: string) => c.deadlines.find((d) => d.step === s);
  const today = isoDate(now);
  void today;

  // 1. Filed grievance -> SLA deadline exists
  if (c.filed_at && !dl("grievance_sla")) {
    A.push({
      kind: "add_deadline",
      step: "grievance_sla",
      label: "Department must act",
      basis: "slaBasis",
      startsOn: c.filed_at,
      dueOn: addDays(c.filed_at, c.slaDays),
    });
  }

  // 2. SLA missed -> overdue + reminder draft + reminder grace deadline
  const sla = dl("grievance_sla");
  if (c.status === "filed" && sla && sla.status === "pending" && isPast(sla.due_on, now)) {
    A.push(
      { kind: "miss_deadline", step: "grievance_sla" },
      { kind: "set_status", status: "overdue" },
      { kind: "draft", doc: "reminder" },
      {
        kind: "add_deadline",
        step: "reminder_grace",
        label: "Reminder grace period",
        basis: "Nivaran policy: one reminder before RTI",
        startsOn: sla.due_on,
        dueOn: addDays(sla.due_on, pack.reminderGraceDays),
      },
      { kind: "event", type: "ladder", payload: { to: "overdue", daysLate: 0 } }
    );
    return A;
  }

  // 3. Grace passed -> RTI draft
  const grace = dl("reminder_grace");
  if (c.status === "overdue" && grace && grace.status === "pending" && isPast(grace.due_on, now)) {
    A.push(
      { kind: "miss_deadline", step: "reminder_grace" },
      { kind: "set_status", status: "rti_ready" },
      { kind: "draft", doc: "rti" },
      { kind: "event", type: "ladder", payload: { to: "rti_ready" } }
    );
    return A;
  }

  // 4. RTI filed -> response deadline (30d or 48h)
  if (c.rti_filed_at && !dl("rti_response")) {
    const due = c.life_or_liberty ? addDays(c.rti_filed_at, 2) : addDays(c.rti_filed_at, pack.rti.responseDays);
    A.push({
      kind: "add_deadline",
      step: "rti_response",
      label: c.life_or_liberty ? "PIO must reply (life or liberty, 48 hours)" : "PIO must reply",
      basis: c.life_or_liberty ? "RTI Act s.7(1) proviso" : "RTI Act s.7(1)",
      startsOn: c.rti_filed_at,
      dueOn: due,
    });
  }
  const rtiR = dl("rti_response");
  if (c.status === "rti_filed" && rtiR && rtiR.status === "pending" && isPast(rtiR.due_on, now)) {
    A.push(
      { kind: "miss_deadline", step: "rti_response" },
      { kind: "set_status", status: "appeal_ready" },
      { kind: "draft", doc: "first_appeal" },
      {
        kind: "add_deadline",
        step: "first_appeal_window",
        label: "File First Appeal by",
        basis: "RTI Act s.19(1)",
        startsOn: rtiR.due_on,
        dueOn: addDays(rtiR.due_on, pack.rti.firstAppealWithinDays),
      },
      { kind: "event", type: "ladder", payload: { to: "appeal_ready", ground: "deemed_refusal_s7_2" } }
    );
    return A;
  }

  // 5. Appeal filed -> disposal deadline; missed -> second appeal
  if (c.appeal_filed_at && !dl("first_appeal_disposal")) {
    A.push({
      kind: "add_deadline",
      step: "first_appeal_disposal",
      label: "First Appellate Authority must decide",
      basis: "RTI Act s.19(6)",
      startsOn: c.appeal_filed_at,
      dueOn: addDays(c.appeal_filed_at, pack.rti.firstAppealDisposalDays),
    });
  }
  const fad = dl("first_appeal_disposal");
  if (c.status === "appeal_filed" && fad && fad.status === "pending" && isPast(fad.due_on, now)) {
    A.push(
      { kind: "miss_deadline", step: "first_appeal_disposal" },
      { kind: "set_status", status: "second_appeal_ready" },
      { kind: "draft", doc: "second_appeal" },
      {
        kind: "add_deadline",
        step: "second_appeal_window",
        label: "File Second Appeal by",
        basis: "RTI Act s.19(3)",
        startsOn: fad.due_on,
        dueOn: addDays(fad.due_on, pack.rti.secondAppealWithinDays),
      },
      { kind: "event", type: "ladder", payload: { to: "second_appeal_ready" } }
    );
  }

  return A;
}
