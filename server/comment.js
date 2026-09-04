const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { getSession, clientIp, hashSimplePw } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const { postId, body, author, pw } = await readBody(req);
  const text = String(body || "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "내용을 입력하세요." });
  if (!isAdmin && !pw) return res.status(400).json({ ok: false, error: "댓글 비밀번호가 필요합니다." });
  if (!isAdmin && pw && String(pw).length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상이어야 합니다." });

  let errorOut = null;
  await update("posts", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === postId);
    if (!p) { errorOut = "게시글을 찾을 수 없습니다."; return cur; }
    p.comments = p.comments || [];
    p.comments.push({
      id: genId("c"), author: isAdmin ? me.id : (String(author || "").trim() || "익명"),
      body: text, ts: nowIso(), ip: clientIp(req), pw: isAdmin ? null : hashSimplePw(pw),
    });
    return cur;
  });
  if (errorOut) return res.status(404).json({ ok: false, error: errorOut });
  res.status(200).json({ ok: true });
};
