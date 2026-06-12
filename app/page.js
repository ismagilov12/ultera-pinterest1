"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const css = `
:root{--bg:#0e0f12;--card:#17191f;--line:#262932;--txt:#e8e9ec;--mut:#8b8f9a;--acc:#e60023}
body{background:var(--bg)}
.wrap{color:var(--txt);font:15px/1.5 -apple-system,'Segoe UI',sans-serif;padding:32px 20px;max-width:1060px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--mut);margin-bottom:28px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.v{font-size:30px;font-weight:700;letter-spacing:-.5px}
.l{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.6px;margin-top:2px}
.row{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:22px}
@media(max-width:800px){.row{grid-template-columns:1fr}}
.btns{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;align-items:center}
button{background:var(--acc);color:#fff;border:0;border-radius:10px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer}
button.sec{background:var(--card);border:1px solid var(--line);color:var(--txt)}
button:disabled{opacity:.45;cursor:default}
input{background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:11px 14px;font-size:14px}
canvas{width:100%;height:190px}
table{width:100%;border-collapse:collapse;font-size:13px}
td{padding:7px 4px;border-top:1px solid var(--line);color:var(--mut)}
td:first-child{color:var(--txt)}
.tag{font-size:11px;padding:2px 8px;border-radius:20px;background:var(--line)}
.warn{color:#f5a623;font-size:13px;margin-bottom:18px}
.msg{color:var(--mut);font-size:13px}
h3{font-size:14px;margin:0 0 12px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px}
.gate{max-width:340px;margin:120px auto;display:flex;flex-direction:column;gap:12px}
`;

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n ?? 0));

export default function Page() {
  const [key, setKey] = useState(null);
  const [keyInput, setKeyInput] = useState("");
  const [state, setState] = useState(null);
  const [an, setAn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => setKey(localStorage.getItem("admin_key") || ""), []);

  const hdr = useCallback(() => ({ "x-admin-key": key || "" }), [key]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { headers: hdr() });
      if (r.status === 401) { setState(null); return; }
      setState(await r.json());
      const a = await fetch("/api/analytics", { headers: hdr() });
      setAn(await a.json());
    } catch {}
  }, [hdr]);

  useEffect(() => {
    if (key === null) return;
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [key, refresh]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !an || an.error || !an.days?.length) return;
    const x = c.getContext("2d");
    const W = (c.width = c.offsetWidth), H = (c.height = 190), P = 24, n = an.days.length;
    x.clearRect(0, 0, W, H);
    const mx = Math.max(...an.impressions, 1), bw = (W - P * 2) / n;
    an.impressions.forEach((v, i) => {
      const h = ((H - P * 2) * v) / mx;
      x.fillStyle = "#3b3f4d";
      x.fillRect(P + i * bw + 1, H - P - h, Math.max(bw - 2, 1), h);
    });
    const mo = Math.max(...an.outbound, 1);
    x.strokeStyle = "#e60023"; x.lineWidth = 2; x.beginPath();
    an.outbound.forEach((v, i) => {
      const X = P + i * bw + bw / 2, Y = H - P - ((H - P * 2) * v) / mo;
      i ? x.lineTo(X, Y) : x.moveTo(X, Y);
    });
    x.stroke();
    x.fillStyle = "#8b8f9a"; x.font = "10px sans-serif";
    x.fillText(an.days[0] || "", P, H - 8);
    x.fillText(an.days[n - 1] || "", W - P - 34, H - 8);
    x.fillText("▮ просмотры", P, 12);
    x.fillStyle = "#e60023"; x.fillText("— переходы", P + 84, 12);
  }, [an]);

  const act = async (path, label) => {
    setBusy(true); setMsg(label + "…");
    try {
      const r = await fetch(path, { method: "POST", headers: hdr() });
      const j = await r.json();
      setMsg(j.error ? "Ошибка: " + j.error :
        j.posted !== undefined ? `Опубликовано: ${j.posted}, ошибок: ${j.failed}` :
        j.added !== undefined ? `Найдено: ${j.found}, новых: ${j.added}` : "Готово");
    } catch (e) { setMsg("Ошибка: " + e); }
    setBusy(false); refresh();
  };

  if (key === null) return null;

  if (state === null)
    return (
      <div className="wrap"><style>{css}</style>
        <div className="gate card">
          <h3>Пароль панели</h3>
          <input type="password" value={keyInput} placeholder="Пароль…"
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (localStorage.setItem("admin_key", keyInput), setKey(keyInput))} />
          <button onClick={() => { localStorage.setItem("admin_key", keyInput); setKey(keyInput); }}>Войти</button>
        </div>
      </div>
    );

  const s = state.stats || {}, sum = an?.summary || {};
  const cards = [
    ["В очереди", fmt(s.queued)], ["Опубликовано", fmt(s.posted)],
    ["Просмотры · 30д", an?.error ? "—" : fmt(sum.impressions)],
    ["Клики · 30д", an?.error ? "—" : fmt(sum.pin_clicks)],
    ["Переходы на сайт · 30д", an?.error ? "—" : fmt(sum.outbound_clicks)],
    ["Сохранения · 30д", an?.error ? "—" : fmt(sum.saves)],
  ];

  return (
    <div className="wrap"><style>{css}</style>
      <h1>ULTERA → Pinterest</h1>
      <div className="sub">Автопубликация фото · ultera.in.ua</div>
      {!state.token_set && (
        <div className="warn">⚠ Pinterest не подключён — нажми «Подключить Pinterest» и подтверди доступ.</div>
      )}
      <div className="grid">
        {cards.map((c) => (
          <div className="card" key={c[0]}><div className="v">{c[1]}</div><div className="l">{c[0]}</div></div>
        ))}
      </div>
      <div className="btns">
        <button disabled={busy || !state.token_set} onClick={() => act("/api/publish", "Публикую")}>
          Опубликовать сейчас
        </button>
        <button className="sec" disabled={busy} onClick={() => act("/api/collect", "Собираю фото")}>
          Собрать фото с сайта
        </button>
        {!state.token_set && (
          <button className="sec" onClick={() => (location.href = `/api/auth/start?key=${encodeURIComponent(key)}`)}>
            Подключить Pinterest
          </button>
        )}
        <span className="msg">{msg}</span>
      </div>
      <div className="row">
        <div className="card"><h3>Просмотры и переходы · 30 дней</h3>
          {an?.error ? <div className="msg">{an.error}</div> : <canvas ref={canvasRef} />}
        </div>
        <div className="card"><h3>Как это работает</h3>
          <div className="msg">
            Каждый день в 10:00 (Киев) сервер сам публикует 5 пинов из очереди со ссылками на сайт.
            Раз в неделю сам собирает новые фото с сайта. Кнопки выше — для ручного запуска.
          </div>
        </div>
      </div>
      <div className="card"><h3>Последние публикации</h3>
        <table><tbody>
          {(state.recent || []).map((r, i) => (
            <tr key={i}>
              <td>{r.title}</td>
              <td><span className="tag">{r.source}</span></td>
              <td>{(r.posted_at || "").slice(0, 16).replace("T", " ")}</td>
            </tr>
          ))}
          {!state.recent?.length && <tr><td>Пока ничего не опубликовано</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
