// Anonymous citizen session. No login: a session is an httpOnly cookie holding a uuid,
// upserted into the `sessions` table. Every case is scoped to a session so one citizen's
// browser cannot read another's grievance text.
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "nv_sid";

/** Get (and, by default, create) the session id for this browser. Can only create a cookie
 *  from a route handler or server action, never from a page render. Pages should call with
 *  create=false and treat a null session as "not yet created". */
export async function getSessionId(create = true): Promise<string | null> {
  const jar = await cookies();
  let sid = jar.get(COOKIE_NAME)?.value ?? null;
  if (!sid && create) {
    sid = crypto.randomUUID();
    jar.set(COOKIE_NAME, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 120,
    });
    await db().from("sessions").insert({ id: sid });
  }
  return sid;
}

export async function getClockOffsetDays(sid: string): Promise<number> {
  const { data } = await db().from("sessions").select("clock_offset_days").eq("id", sid).single();
  return data?.clock_offset_days ?? 0;
}
