const { readBody, methodNotAllowed, nowIso } = require("./_lib/http");
const { hashPw, bootstrapAccounts } = require("./_lib/auth");
const { readJSON, update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const { id, pw, org, name, empno } = await readBody(req);
  if (!id || !pw || !org || !name || !/^\d+$/.test(String(empno || ""))) {
    return res.status(400).json({ ok: false, error: "입력값을 확인하세요." });
  }
  await bootstrapAccounts();
  const accounts = await readJSON("accounts", { items: [] });
  if ((accounts.items || []).some((a) => a.id === id)) {
    return res.status(400).json({ ok: false, error: "이미 사용 중인 아이디입니다." });
  }
  const pending = await readJSON("pending_accounts", { items: [] });
  if ((pending.items || []).some((a) => a.id === id)) {
    return res.status(400).json({ ok: false, error: "이미 승인 대기 중인 아이디입니다." });
  }
  await update("pending_accounts", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.push({ id, pw: hashPw(pw), org, name, empno, ts: nowIso() });
    return cur;
  });
  res.status(200).json({ ok: true });
};
