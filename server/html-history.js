const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("html_history", { items: [] });
  const items = (db.items || []).map(({ url, ...rest }) => rest);
  res.status(200).json({ ok: true, items });
};
