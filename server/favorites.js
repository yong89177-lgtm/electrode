const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAuth } = require("./_lib/auth");
const { readJSON, update } = require("./_lib/blob");

module.exports = async (req, res) => {
  const s = await requireAuth(req, res);
  if (!s) return;

  if (req.method === "GET") {
    const db = await readJSON("favorites", { items: {} });
    return res.status(200).json({ favorites: (db.items && db.items[s.id]) || [] });
  }
  if (req.method !== "POST") return methodNotAllowed(res);
  const { key, on } = await readBody(req);
  if (!key) return res.status(400).json({ ok: false, error: "key가 필요합니다." });

  const out = await update("favorites", { items: {} }, (cur) => {
    cur.items = cur.items || {};
    const list = new Set(cur.items[s.id] || []);
    if (on) list.add(key); else list.delete(key);
    cur.items[s.id] = [...list];
    return cur;
  });
  res.status(200).json({ ok: true, favorites: out.items[s.id] || [] });
};
