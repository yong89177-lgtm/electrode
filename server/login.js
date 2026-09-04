const { readBody, methodNotAllowed, nowIso } = require("./_lib/http");
const { findAccount, verifyPw, createSession, clientIp } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const { id, pw } = await readBody(req);
  const ip = clientIp(req);
  let ok = false;
  try {
    if (id && pw) {
      const acc = await findAccount(String(id));
      if (acc && verifyPw(pw, acc.pw)) {
        ok = true;
        await createSession(acc, req, res);
        await update("history", { events: [] }, (cur) => {
          cur.events = cur.events || [];
          cur.events.unshift({ ts: nowIso(), id: acc.id, ip, ok: true });
          cur.events = cur.events.slice(0, 500);
          return cur;
        });
        return res.status(200).json({ ok: true, id: acc.id, role: acc.role });
      }
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "서버 오류" });
  }
  await update("history", { events: [] }, (cur) => {
    cur.events = cur.events || [];
    cur.events.unshift({ ts: nowIso(), id: id || "", ip, ok: false });
    cur.events = cur.events.slice(0, 500);
    return cur;
  });
  res.status(200).json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
};
