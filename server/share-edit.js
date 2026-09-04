const { readBody, methodNotAllowed } = require("./_lib/http");
const { getSession, verifyPw } = require("./_lib/auth");
const { update, putFile, deleteFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

const SHARE_MAX = 100 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const body = await readBody(req);
  const { id } = body;
  if (!id) return res.status(400).json({ ok: false, error: "id가 필요합니다." });
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, error: "자료명을 입력하세요." });

  let errorOut = null, oldFileUrl = null;
  await update("share", { items: [] }, async (cur) => {
    const it = (cur.items || []).find((x) => x.id === id);
    if (!it) { errorOut = "항목을 찾을 수 없습니다."; return cur; }
    if (!isAdmin && !verifyPw(body.pw, it.pw)) { errorOut = "비밀번호가 일치하지 않습니다."; return cur; }

    it.name = name;
    it.desc = String(body.desc || "");
    it.who = String(body.who || "");
    if (isAdmin && body.org !== undefined) it.org = String(body.org || "");

    if (body.file && body.file.data) {
      if ((body.file.size || 0) > SHARE_MAX) { errorOut = "파일이 100MB를 초과합니다."; return cur; }
      oldFileUrl = it.fileUrl || null;
      const buf = Buffer.from(body.file.data, "base64");
      const stored = await putFile(`share/${id}/${body.file.name}`, buf, mimeFor(body.file.name));
      it.fname = body.file.name; it.size = body.file.size || buf.length; it.fileUrl = stored.url; it.url = "";
    } else if (body.url) {
      if (it.fileUrl) { oldFileUrl = it.fileUrl; it.fileUrl = ""; it.fname = ""; it.size = 0; }
      it.url = String(body.url);
    }
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  if (oldFileUrl) await deleteFile(oldFileUrl);
  res.status(200).json({ ok: true });
};
