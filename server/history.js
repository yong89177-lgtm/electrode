const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("history", { events: [] });
  res.status(200).json({ ok: true, events: db.events || [] });
};
