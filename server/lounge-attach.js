const { readJSON, fetchFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  const postId = (req.query && req.query.post) || "";
  const idx = Number((req.query && req.query.idx) || -1);
  const dl = (req.query && req.query.dl) || "";
  const db = await readJSON("lounge", { items: [] });
  const p = (db.items || []).find((x) => x.id === postId);
  const a = p && (p.attachments || []).find((x) => x.idx === idx);
  if (!a) return res.status(404).json({ ok: false, error: "첨부를 찾을 수 없습니다." });
  const buf = await fetchFile(a.url);
  if (!buf) return res.status(404).json({ ok: false, error: "파일을 찾을 수 없습니다." });
  res.setHeader("Content-Type", mimeFor(a.name));
  res.setHeader("Content-Disposition", `${dl ? "attachment" : "inline"}; filename="${encodeURIComponent(a.name)}"`);
  res.status(200).send(buf);
};
