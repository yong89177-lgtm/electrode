const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const { key, waive, until } = await readBody(req);
  if (!key) return res.status(400).json({ ok: false, error: "key가 필요합니다." });
  await update("health", { items: {} }, (cur) => {
    cur.items = cur.items || {};
    if (waive) cur.items[key] = { waived: true, waiveUntil: until || "" };
    else delete cur.items[key];
    return cur;
  });
  res.status(200).json({ ok: true });
};
