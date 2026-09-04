const { readBody, methodNotAllowed } = require("./_lib/http");
const { getSession, verifyPw } = require("./_lib/auth");
const { update, deleteFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const { id, pw } = await readBody(req);

  let errorOut = null;
  let removed = null;
  await update("posts", { items: [] }, (cur) => {
    const p = (cur.items || []).find((x) => x.id === id);
    if (!p) { errorOut = "게시글을 찾을 수 없습니다."; return cur; }
    if (!isAdmin && !verifyPw(pw, p.pw)) { errorOut = "비밀번호가 일치하지 않습니다."; return cur; }
    removed = p;
    cur.items = cur.items.filter((x) => x.id !== id);
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  for (const a of (removed && removed.attachments) || []) await deleteFile(a.url);
  res.status(200).json({ ok: true });
};
