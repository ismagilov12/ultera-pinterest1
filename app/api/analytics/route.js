import { analytics } from "../../../lib/pinterest";
import { isAdmin, deny } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAdmin(req)) return deny();
  try {
    return Response.json(await analytics());
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 200 });
  }
}
