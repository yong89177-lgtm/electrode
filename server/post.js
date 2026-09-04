const { methodNotAllowed } = require("./_lib/http");
const { getSession, setCookie, parseCookies } = require("./_lib/auth");
const { readJSON, update } = require("./_lib/blob");
const { createPost } = require("./_lib/postsCreate");

module.exports = async (req, res) => {
  if (req.method === "POST") return createPost(req, res);
  if (req.method !== "GET") return methodNotAllowed(res);

  const id = (req.query && req.query.id) || "";
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";

  const db = await update("posts", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === id);
    if (p) p.views = (p.views || 0) + 1;
    return cur;
  });
  const p = (db.items || []).find((x) => x.id === id);
  if (!p) return res.status(404).json({ ok: false, error: "게시글을 찾을 수 없습니다." });

  const readIds = new Set((parseCookies(req).mp_read || "").split(",").filter(Boolean));
  readIds.add(id);
  setCookie(res, "mp_read", [...readIds].slice(-300).join(","), { maxAge: 180 * 86400 });

  res.status(200).json({
    ok: true,
    post: {
      id: p.id, title: p.title, body: p.body, category: p.category, author: p.author,
      ts: p.ts, views: p.views || 0, pinned: !!p.pinned,
      ip: isAdmin ? p.ip : undefined,
      likes: (p.likedBy || []).length,
      liked: !!(me && (p.likedBy || []).includes(me.id)),
      attachments: (p.attachments || []).map(({ url, ...rest }) => rest),
      comments: (p.comments || []).map((c) => ({
        id: c.id, author: c.author, body: c.body, ts: c.ts,
        ip: isAdmin ? c.ip : undefined,
      })),
    },
  });
};
