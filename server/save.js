const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { writeJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const draft = await readBody(req);
  if (!draft || !Array.isArray(draft.columns)) {
    return res.status(400).json({ ok: false, error: "columns 배열이 필요합니다." });
  }
  await writeJSON("dashboards", draft);
  res.status(200).json({ ok: true });
};
