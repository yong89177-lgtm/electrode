const { methodNotAllowed } = require("./_lib/http");
const { getSession, parseCookies } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res);
  const scope = String((req.query && req.query.scope) || "all");
  const q = String((req.query && req.query.q) || "").trim().toLowerCase();
  const db = await readJSON("posts", { items: [] });
  const readIds = (parseCookies(req).mp_read || "").split(",").filter(Boolean);
  let items = (db.items || []).map((p) => ({
    id: p.id, title: p.title, author: p.author, ts: p.ts, category: p.category,
    pinned: !!p.pinned, views: p.views || 0, likes: (p.likedBy || []).length,
    comments: (p.comments || []).length, attachments: (p.attachments || []).length,
    read: readIds.includes(p.id),
  }));
  if (q) {
    items = items.filter((p) => {
      const full = db.items.find((x) => x.id === p.id);
      const hay = {
        title: (full.title || "").toLowerCase(),
        body: (full.body || "").toLowerCase(),
        author: (full.author || "").toLowerCase(),
      };
      if (scope === "title") return hay.title.includes(q);
      if (scope === "body") return hay.body.includes(q);
      if (scope === "author") return hay.author.includes(q);
      return hay.title.includes(q) || hay.body.includes(q) || hay.author.includes(q);
    });
  }
  items.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  res.status(200).json({ ok: true, posts: items });
};
