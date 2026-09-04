const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update, deleteFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const { id } = await readBody(req);
  let removed = null;
  await update("popups", { items: [] }, (cur) => {
    removed = (cur.items || []).find((x) => x.id === id) || null;
    cur.items = (cur.items || []).filter((x) => x.id !== id);
    return cur;
  });
  if (removed && removed.imageUrl) await deleteFile(removed.imageUrl);
  res.status(200).json({ ok: true });
};
