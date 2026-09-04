const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAuth } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const s = await requireAuth(req, res);
  if (!s) return;
  const { id } = await readBody(req);
  let liked = false, count = 0, errorOut = null;
  await update("posts", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === id);
    if (!p) { errorOut = "게시글을 찾을 수 없습니다."; return cur; }
    p.likedBy = p.likedBy || [];
    const i = p.likedBy.indexOf(s.id);
    if (i === -1) { p.likedBy.push(s.id); liked = true; } else { p.likedBy.splice(i, 1); liked = false; }
    count = p.likedBy.length;
    return cur;
  });
  if (errorOut) return res.status(404).json({ ok: false, error: errorOut });
  res.status(200).json({ ok: true, liked, count });
};
