const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  const db = await readJSON("posts", { items: [] });
  const notices = (db.items || [])
    .filter((p) => p.category === "공지")
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, 10)
    .map((p) => ({ id: p.id, title: p.title, ts: p.ts, category: p.category }));
  res.status(200).json({ ok: true, notice: notices[0] || null, notices });
};
