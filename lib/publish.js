// Публикация партии пинов из очереди
import { sb } from "./supabase";
import { getOrCreateBoard, createPin } from "./pinterest";

export async function publishBatch(limit = 5) {
  const boardId = await getOrCreateBoard();

  const { data: rows, error } = await sb
    .from("pins")
    .select("image_url,title,description,alt_text,link,source")
    .eq("status", "queued")
    .limit(50);
  if (error) throw new Error(error.message);
  if (!rows?.length) return { posted: 0, failed: 0, message: "Очередь пуста" };

  // случайный выбор, чтобы пины шли вперемешку по моделям
  const batch = rows.sort(() => Math.random() - 0.5).slice(0, limit);

  let posted = 0, failed = 0;
  for (const item of batch) {
    try {
      const pinId = await createPin(boardId, item);
      await sb.from("pins").update({
        status: "posted", pin_id: pinId, posted_at: new Date().toISOString(),
      }).eq("image_url", item.image_url);
      posted++;
    } catch (e) {
      await sb.from("pins").update({
        status: "failed", error: String(e).slice(0, 500),
      }).eq("image_url", item.image_url);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { posted, failed };
}
