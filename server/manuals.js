const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  const db = await readJSON("manuals", { items: [] });
  const manuals = (db.items || []).map(({ fileUrl, ...rest }) => rest);
  res.status(200).json({ ok: true, manuals });
};
