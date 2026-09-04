const { readJSON, fetchFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || "";
  const db = await readJSON("manuals", { items: [] });
  const m = (db.items || []).find((x) => x.id === id);
  if (!m) return res.status(404).json({ ok: false, error: "매뉴얼을 찾을 수 없습니다." });
  const buf = await fetchFile(m.fileUrl);
  if (!buf) return res.status(404).json({ ok: false, error: "파일을 찾을 수 없습니다." });
  res.setHeader("Content-Type", mimeFor(m.filename));
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(m.filename)}"`);
  res.status(200).send(buf);
};
