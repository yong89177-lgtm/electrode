const { readJSON } = require("./_lib/blob");
const { parseCookies } = require("./_lib/auth");

module.exports = async (req, res) => {
  const db = await readJSON("popups", { items: [] });
  const dismissed = new Set((parseCookies(req).mp_pdismiss || "").split(",").filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  const popups = (db.items || [])
    .filter((p) => p.active)
    .filter((p) => !p.start || p.start <= today)
    .filter((p) => !p.end || p.end >= today)
    .filter((p) => !dismissed.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }));
  res.status(200).json({ ok: true, popups });
};
