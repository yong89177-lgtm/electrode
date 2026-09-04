const { readJSON } = require("./_lib/blob");
const { sumLastNDays } = require("./_lib/stats");

module.exports = async (req, res) => {
  const db = await readJSON("dash_access", { agg: {} });
  const items = {};
  Object.keys(db.agg || {}).forEach((key) => {
    items[key] = sumLastNDays(db.agg[key].days, 7);
  });
  res.status(200).json({ ok: true, items });
};
