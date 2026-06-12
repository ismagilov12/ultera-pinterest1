// Парсер ultera.in.ua: товары и фото из встроенных JSON (#DATA, #EXTRA)
import { makePinCopy } from "./keywords";
import { sb } from "./supabase";

const SITE = "https://ultera.in.ua";
const UTM = "utm_source=pinterest&utm_medium=pin&utm_campaign=auto";

const abs = (u) => (u.startsWith("http") ? u : SITE + (u.startsWith("/") ? "" : "/") + u);

export async function collectSite() {
  const res = await fetch(SITE + "/", {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  const html = await res.text();

  const dataM = html.match(/<script id="DATA" type="application\/json">([\s\S]*?)<\/script>/);
  const extraM = html.match(/<script id="EXTRA" type="application\/json">([\s\S]*?)<\/script>/);
  if (!dataM) throw new Error("Блок #DATA не найден — структура сайта изменилась");

  const data = JSON.parse(dataM[1]);
  const galleries = extraM ? JSON.parse(extraM[1]) : {};

  const items = [];
  const seen = new Set();

  for (const p of data.all || []) {
    const photos = [p.photo, ...(galleries[p.uid] || [])].filter(Boolean);
    const copy = makePinCopy(p);
    const family = (p.family || "collection").toLowerCase();
    const link = `${SITE}/?${UTM}&utm_content=${encodeURIComponent(family)}#collection`;
    for (const ph of photos) {
      const url = abs(ph);
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ image_url: url, source: "site", link, ...copy });
    }
  }

  // имиджевые баннеры
  const banners = [...html.matchAll(/(?:src|srcset|href)="((?:\/)?banners\/[^"]+\.(?:jpg|webp|png))"/g)]
    .map((m) => abs(m[1]));
  for (const url of new Set(banners)) {
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      image_url: url,
      source: "site",
      title: "ULTERA — handcrafted sneakers from Kharkiv, Ukraine",
      description:
        "ULTERA: кросівки ручної роботи з італійської шкіри Nappa. Bounce EVA, гарантія 1 рік. Handcrafted sneakers made in Ukraine. #sneakers #handmade #ultera",
      alt_text: "ULTERA handcrafted sneakers brand photo",
      link: `${SITE}/?${UTM}&utm_content=banner`,
    });
  }

  // в базу, дубли игнорируются
  const before = await count();
  const { error } = await sb.from("pins").upsert(items, {
    onConflict: "image_url",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
  const after = await count();
  return { found: items.length, added: after - before };
}

async function count() {
  const { count: n } = await sb.from("pins").select("*", { count: "exact", head: true });
  return n || 0;
}
