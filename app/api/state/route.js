import { sb } from "../../../lib/supabase";
import { getSetting } from "../../../lib/pinterest";
import { isAdmin, deny } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAdmin(req)) return deny();
  const counts = {};
  for (const s of ["queued", "posted", "failed"]) {
    const { count } = await sb.from("pins").select("*", { count: "exact", head: true }).eq("status", s);
    counts[s] = count || 0;
  }
  const { data: recent } = await sb
    .from("pins")
    .select("title,source,posted_at,pin_id")
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .limit(10);
  const tokenSet = Boolean(await getSetting("pt_access_token"));
  return Response.json({ stats: counts, recent: recent || [], token_set: tokenSet });
}
