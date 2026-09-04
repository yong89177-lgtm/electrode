const { requireAdmin } = require("./_lib/auth");
const { readJSON, fetchFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = (req.query && req.query.id) || "";
  const db = await readJSON("html_history", { items: [] });
  const item = (db.items || []).find((x) => x.id === id);
  if (!item) return res.status(404).json({ ok: false, error: "이력을 찾을 수 없습니다." });
  const buf = await fetchFile(item.url);
  if (!buf) return res.status(404).json({ ok: false, error: "파일을 찾을 수 없습니다." });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(item.version || item.id)}.html"`);
  res.status(200).send(buf);
};
