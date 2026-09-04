const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { readJSON, update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const { id, approve } = await readBody(req);
  const pending = await readJSON("pending_accounts", { items: [] });
  const p = (pending.items || []).find((a) => a.id === id);
  if (!p) return res.status(404).json({ ok: false, error: "신청을 찾을 수 없습니다." });

  if (approve) {
    await update("accounts", { items: [] }, (cur) => {
      cur.items = cur.items || [];
      if (!cur.items.some((a) => a.id === id)) {
        cur.items.push({ id: p.id, pw: p.pw, role: "user", name: p.name, org: p.org, empno: p.empno, createdAt: new Date().toISOString() });
      }
      return cur;
    });
  }
  await update("pending_accounts", { items: [] }, (cur) => {
    cur.items = (cur.items || []).filter((a) => a.id !== id);
    return cur;
  });
  res.status(200).json({ ok: true });
};
