const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");
const { sumLastNDays } = require("./_lib/stats");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("site_visits", { total: 0, days: {}, ips: {} });
  const today = new Date().toISOString().slice(0, 10);
  res.status(200).json({
    ok: true,
    total: db.total || 0,
    today: (db.days || {})[today] || 0,
    last7: sumLastNDays(db.days, 7),
    unique: Object.keys(db.ips || {}).length,
  });
};
