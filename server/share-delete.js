const { readBody, methodNotAllowed } = require("./_lib/http");
const { getSession, verifyPw } = require("./_lib/auth");
const { update, deleteFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const { id, pw } = await readBody(req);

  let errorOut = null, removed = null;
  await update("share", { items: [] }, (cur) => {
    const it = (cur.items || []).find((x) => x.id === id);
    if (!it) { errorOut = "항목을 찾을 수 없습니다."; return cur; }
    if (!isAdmin && !verifyPw(pw, it.pw)) { errorOut = "비밀번호가 일치하지 않습니다."; return cur; }
    removed = it;
    cur.items = cur.items.filter((x) => x.id !== id);
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  if (removed && removed.fileUrl) await deleteFile(removed.fileUrl);
  res.status(200).json({ ok: true });
};
