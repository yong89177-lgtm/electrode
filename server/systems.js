const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { readJSON, writeJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const db = await readJSON("systems", { items: [] });
    return res.status(200).json({ ok: true, items: db.items || [] });
  }
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const { items } = await readBody(req);
  const clean = (Array.isArray(items) ? items : []).map((s) => ({
    name: String(s.name || "").slice(0, 60),
    url: String(s.url || "").slice(0, 500),
    active: !!s.active,
  }));
  await writeJSON("systems", { items: clean });
  res.status(200).json({ ok: true, items: clean });
};
