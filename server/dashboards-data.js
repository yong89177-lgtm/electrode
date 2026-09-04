/* vercel.json 리라이트로 GET /data/dashboards.json 요청이 여기로 온다. */
const { readJSON } = require("./_lib/blob");
const FALLBACK = require("./_lib/fallback-dashboards");

module.exports = async (req, res) => {
  const state = await readJSON("dashboards", FALLBACK);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json(state);
};
