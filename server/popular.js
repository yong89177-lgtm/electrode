const { readJSON } = require("./_lib/blob");
const { sumLastNDays } = require("./_lib/stats");

module.exports = async (req, res) => {
  const db = await readJSON("dash_access", { agg: {} });
  const items = Object.keys(db.agg || {})
    .map((key) => ({ name: db.agg[key].name, team: db.agg[key].team, _score: sumLastNDays(db.agg[key].days, 7) }))
    .filter((x) => x._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
    .map(({ name, team }) => ({ name, team }));
  res.status(200).json({ ok: true, items });
};
