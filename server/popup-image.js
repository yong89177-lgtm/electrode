const { readJSON, fetchFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || "";
  const db = await readJSON("popups", { items: [] });
  const p = (db.items || []).find((x) => x.id === id);
  if (!p || !p.imageUrl) return res.status(404).send("");
  const buf = await fetchFile(p.imageUrl);
  if (!buf) return res.status(404).send("");
  res.setHeader("Content-Type", mimeFor(p.imageName || "image.png"));
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(buf);
};
