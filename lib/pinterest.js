// Pinterest API v5: токены (с автообновлением), доски, пины, аналитика
import { sb } from "./supabase";

const API = "https://api.pinterest.com/v5";

export async function getSetting(key) {
  const { data } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  await sb.from("settings").upsert({ key, value });
}

export async function saveTokens(tok) {
  await setSetting("pt_access_token", tok.access_token);
  if (tok.refresh_token) await setSetting("pt_refresh_token", tok.refresh_token);
  await setSetting("pt_expires_at", String(Date.now() + (tok.expires_in || 86400) * 1000));
}

async function refreshToken() {
  const refresh = await getSetting("pt_refresh_token");
  if (!refresh) throw new Error("Pinterest не подключён — нажми «Подключить Pinterest»");
  const basic = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
  ).toString("base64");
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!res.ok) throw new Error(`Не удалось обновить токен: ${await res.text()}`);
  const tok = await res.json();
  await saveTokens(tok);
  return tok.access_token;
}

export async function getToken() {
  const token = await getSetting("pt_access_token");
  if (!token) throw new Error("Pinterest не подключён — нажми «Подключить Pinterest»");
  const exp = Number(await getSetting("pt_expires_at")) || 0;
  if (Date.now() > exp - 5 * 60 * 1000) return refreshToken();
  return token;
}

export async function api(method, path, body) {
  const token = await getToken();
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Pinterest ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function getOrCreateBoard() {
  let boardId = await getSetting("pt_board_id");
  if (boardId) return boardId;
  const name = "ULTERA Sneakers";
  const boards = (await api("GET", "/boards?page_size=100")).items || [];
  const found = boards.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (found) boardId = found.id;
  else boardId = (await api("POST", "/boards", { name, privacy: "PUBLIC" })).id;
  await setSetting("pt_board_id", boardId);
  return boardId;
}

export async function createPin(boardId, item) {
  const pin = await api("POST", "/pins", {
    board_id: boardId,
    title: item.title,
    description: item.description,
    alt_text: item.alt_text,
    link: item.link,
    media_source: { source_type: "image_url", url: item.image_url },
  });
  return pin.id;
}

export async function analytics() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400 * 1000);
  const d = (x) => x.toISOString().slice(0, 10);
  const qs = new URLSearchParams({
    start_date: d(start),
    end_date: d(end),
    metric_types: "IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE",
    granularity: "DAY",
  });
  const raw = await api("GET", `/user_account/analytics?${qs}`);
  const daily = raw.all?.daily_metrics || [];
  const days = [], impressions = [], outbound = [];
  let sumImp = 0, sumClk = 0, sumOut = 0, sumSav = 0;
  for (const dm of daily) {
    const m = dm.metrics || {};
    days.push((dm.date || "").slice(5));
    impressions.push(m.IMPRESSION || 0);
    outbound.push(m.OUTBOUND_CLICK || 0);
    sumImp += m.IMPRESSION || 0;
    sumClk += m.PIN_CLICK || 0;
    sumOut += m.OUTBOUND_CLICK || 0;
    sumSav += m.SAVE || 0;
  }
  return {
    summary: { impressions: sumImp, pin_clicks: sumClk, outbound_clicks: sumOut, saves: sumSav },
    days, impressions, outbound,
  };
}
