const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");
const { sumLastNDays, daysSince } = require("./_lib/stats");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const db = await readJSON("dash_access", { agg: {} });
  const items = Object.keys(db.agg || {}).map((key) => {
    const a = db.agg[key];
    const last7 = sumLastNDays(a.days, 7);
    const total = a.total || 0;
    return {
      name: a.name || key,
      team: a.team || "",
      first: a.first || "",
      total,
      uips: Object.keys(a.ips || {}).length,
      avg: Math.round((total / daysSince(a.first)) * 10) / 10,
      last7,
      usage7: total ? Math.round((last7 / total) * 100) : 0,
    };
  });
  items.sort((x, y) => y.total - x.total);
  res.status(200).json({ ok: true, items });
};
