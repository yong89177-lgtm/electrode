const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");
const { serialize } = require("./_lib/dashRequests");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("dash_requests", { items: [] });
  res.status(200).json({ ok: true, items: serialize(db.items) });
};
