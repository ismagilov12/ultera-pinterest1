import { saveTokens } from "../../../../lib/pinterest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("Нет кода авторизации", { status: 400 });
  const basic = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
  ).toString("base64");
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  if (!res.ok) return new Response(`Ошибка обмена токена: ${await res.text()}`, { status: 500 });
  await saveTokens(await res.json());
  return Response.redirect(`${url.origin}/?connected=1`, 302);
}
