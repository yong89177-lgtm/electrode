const { readJSON, fetchFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || "";
  const view = (req.query && req.query.view) || "";
  const db = await readJSON("share", { items: [] });
  const it = (db.items || []).find((x) => x.id === id);
  if (!it || !it.fileUrl) return res.status(404).json({ ok: false, error: "파일을 찾을 수 없습니다." });
  const buf = await fetchFile(it.fileUrl);
  if (!buf) return res.status(404).json({ ok: false, error: "파일을 찾을 수 없습니다." });
  res.setHeader("Content-Type", view ? mimeFor(it.fname) : "application/octet-stream");
  res.setHeader("Content-Disposition", `${view ? "inline" : "attachment"}; filename="${encodeURIComponent(it.fname || "file")}"`);
  res.status(200).send(buf);
};
