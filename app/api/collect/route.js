import { collectSite } from "../../../lib/collect";
import { isAdmin, deny } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req) {
  if (!isAdmin(req)) return deny();
  try {
    return Response.json(await collectSite());
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
