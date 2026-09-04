const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  const db = await readJSON("share", { items: [] });
  const items = (db.items || [])
    .slice()
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .map(({ fileUrl, pw, ...rest }) => rest);
  res.status(200).json({ ok: true, items });
};
