const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("popups", { items: [] });
  const popups = (db.items || []).map(({ imageUrl, ...rest }) => ({ ...rest, hasImage: !!imageUrl }));
  res.status(200).json({ ok: true, popups });
};
