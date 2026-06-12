// Генерация SEO-заголовков и описаний пинов
const KEYWORDS_UA = [
  "кросівки ручної роботи", "шкіряні кросівки", "кросівки Україна",
  "взуття Харків", "стильні кросівки", "якісне взуття",
  "кросівки натуральна шкіра",
];
const KEYWORDS_EN = [
  "handcrafted sneakers", "leather sneakers", "premium sneakers",
  "Nappa leather shoes", "minimalist sneakers", "sneakers made in Ukraine",
  "everyday sneakers", "quality footwear",
];
const HASHTAGS = "#sneakers #handmade #leathersneakers #ultera #кросівки #взуття";

let iUa = 0, iEn = 0, iLang = 0;
const nextUa = () => KEYWORDS_UA[iUa++ % KEYWORDS_UA.length];
const nextEn = () => KEYWORDS_EN[iEn++ % KEYWORDS_EN.length];
const nextLang = () => (iLang++ % 2 === 0 ? "ua" : "en");

const clean = (t) =>
  (t || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export function makePinCopy(product, lang = "mix") {
  if (lang === "mix") lang = nextLang();
  const family = product.family || "";
  const color = product.color_name || "";
  const baseTitle = (product.title || `ULTERA ${family}`).replace("ULTERA - ", "ULTERA ");

  let title, desc, alt;
  if (lang === "ua") {
    const kw1 = nextUa(), kw2 = nextUa();
    title = `${baseTitle} — ${kw1}`;
    desc = `${clean(product.text).slice(0, 280)} ${kw2[0].toUpperCase() + kw2.slice(1)}, італійська шкіра Nappa, амортизація Bounce EVA. Ручна робота, Харків. Гарантія 1 рік. ${HASHTAGS}`;
    alt = `ULTERA ${family} ${color} — кросівки ручної роботи зі шкіри Nappa`;
  } else {
    const kw1 = nextEn(), kw2 = nextEn();
    title = `${baseTitle} — ${kw1}`;
    desc = `ULTERA ${family} in ${color}: ${kw1} with Italian Nappa leather and Bounce EVA cushioning. ${kw2[0].toUpperCase() + kw2.slice(1)} handcrafted in Kharkiv, Ukraine. 1-year warranty, free exchange. ${HASHTAGS}`;
    alt = `ULTERA ${family} ${color} handcrafted Nappa leather sneakers`;
  }
  return {
    title: title.slice(0, 100),
    description: desc.slice(0, 790),
    alt_text: alt.slice(0, 480),
  };
}
