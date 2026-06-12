import { publishBatch } from "../../../../lib/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("forbidden", { status: 403 });
  try {
    return Response.json(await publishBatch(5));
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
