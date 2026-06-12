export function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return true;
  return req.headers.get("x-admin-key") === pass ||
    new URL(req.url).searchParams.get("key") === pass;
}

export function deny() {
  return Response.json({ error: "Неверный пароль" }, { status: 401 });
}
