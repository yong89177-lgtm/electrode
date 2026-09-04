const { readBody, methodNotAllowed } = require("./_lib/http");
const { getSession, verifyPw } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const { postId, replyId, pw } = await readBody(req);

  let errorOut = null;
  await update("lounge", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === postId);
    if (!p) { errorOut = "글을 찾을 수 없습니다."; return cur; }
    const r = (p.replies || []).find((x) => x.id === replyId);
    if (!r) { errorOut = "답글을 찾을 수 없습니다."; return cur; }
    if (!isAdmin && !verifyPw(pw, r.pw)) { errorOut = "비밀번호가 일치하지 않습니다."; return cur; }
    p.replies = p.replies.filter((x) => x.id !== replyId);
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  res.status(200).json({ ok: true });
};
