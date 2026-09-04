const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update, deleteFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const { id } = await readBody(req);

  let errorOut = null, removed = null;
  await update("dash_requests", { items: [] }, (cur) => {
    const q = (cur.items || []).find((x) => x.id === id);
    if (!q) { errorOut = "요청을 찾을 수 없습니다."; return cur; }
    if (q.status !== "pending" && q.status !== "it_approved") { errorOut = "이미 처리된 요청입니다."; return cur; }
    removed = q;
    cur.items = cur.items.filter((x) => x.id !== id);
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  if (removed && removed.fileUrl) await deleteFile(removed.fileUrl);
  res.status(200).json({ ok: true });
};
