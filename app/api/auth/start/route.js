import { isAdmin, deny } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAdmin(req)) return deny();
  const origin = new URL(req.url).origin;
  const qs = new URLSearchParams({
    response_type: "code",
    client_id: process.env.PINTEREST_APP_ID,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: "boards:read,boards:write,pins:read,pins:write,user_accounts:read",
  });
  return Response.redirect(`https://www.pinterest.com/oauth/?${qs}`, 302);
}
