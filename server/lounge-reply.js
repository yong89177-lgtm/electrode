const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { clientIp, hashSimplePw } = require("./_lib/auth");
const { update } = require("./_lib/blob");
const { displayIdentity } = require("./_lib/identity");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const { postId, text, author, pw } = await readBody(req);
  const t = String(text || "").trim();
  if (!t) return res.status(400).json({ ok: false, error: "내용을 입력하세요." });
  const who = await displayIdentity(req, author);
  const isAdmin = who.session && who.session.role === "admin";
  if (!isAdmin && !pw) return res.status(400).json({ ok: false, error: "비밀번호가 필요합니다." });
  if (!isAdmin && pw && String(pw).length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상이어야 합니다." });

  let errorOut = null;
  await update("lounge", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === postId);
    if (!p) { errorOut = "글을 찾을 수 없습니다."; return cur; }
    p.replies = p.replies || [];
    p.replies.push({
      id: genId("r"), name: who.name, org: who.org, anon: who.anon,
      text: t, ts: nowIso(), ip: clientIp(req), pw: isAdmin ? null : hashSimplePw(pw),
    });
    return cur;
  });
  if (errorOut) return res.status(404).json({ ok: false, error: errorOut });
  res.status(200).json({ ok: true });
};
