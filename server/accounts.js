const { readBody, methodNotAllowed } = require("./_lib/http");
const { requireAdmin, hashPw, bootstrapAccounts } = require("./_lib/auth");
const { readJSON, update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await bootstrapAccounts();

  if (req.method === "GET") {
    const db = await readJSON("accounts", { items: [] });
    const accounts = (db.items || []).map((a) => ({
      id: a.id, name: a.name, org: a.org, empno: a.empno, role: a.role,
    }));
    return res.status(200).json({ accounts });
  }

  if (req.method !== "POST") return methodNotAllowed(res);
  const body = await readBody(req);
  const { action, id } = body;
  if (!id) return res.status(400).json({ ok: false, error: "id가 필요합니다." });

  try {
    if (action === "add") {
      if (!body.pw) return res.status(400).json({ ok: false, error: "비밀번호가 필요합니다." });
      await update("accounts", { items: [] }, (cur) => {
        cur.items = cur.items || [];
        if (cur.items.some((a) => a.id === id)) throw new Error("이미 존재하는 아이디입니다.");
        cur.items.push({ id, pw: hashPw(body.pw), role: body.role === "admin" ? "admin" : "user", name: "", org: "", empno: "", createdAt: new Date().toISOString() });
        return cur;
      });
    } else if (action === "update") {
      await update("accounts", { items: [] }, (cur) => {
        cur.items = cur.items || [];
        const a = cur.items.find((x) => x.id === id);
        if (!a) throw new Error("계정을 찾을 수 없습니다.");
        if (body.pw) a.pw = hashPw(body.pw);
        if (body.role) a.role = body.role === "admin" ? "admin" : "user";
        if (body.name !== undefined) a.name = body.name;
        if (body.org !== undefined) a.org = body.org;
        if (body.empno !== undefined) a.empno = body.empno;
        return cur;
      });
    } else if (action === "delete") {
      await update("accounts", { items: [] }, (cur) => {
        cur.items = (cur.items || []).filter((x) => x.id !== id);
        return cur;
      });
    } else {
      return res.status(400).json({ ok: false, error: "알 수 없는 action입니다." });
    }
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
  res.status(200).json({ ok: true });
};
