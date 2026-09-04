const { requireAdmin } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const pending = await readJSON("pending_accounts", { items: [] });
  const reqs = await readJSON("dash_requests", { items: [] });
  const openReqs = (reqs.items || []).filter((q) => q.status === "pending" || q.status === "it_approved").length;
  res.status(200).json({ ok: true, accounts: (pending.items || []).length, requests: openReqs });
};
