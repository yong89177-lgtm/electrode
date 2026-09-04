const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { getSession, clientIp, hashSimplePw } = require("./_lib/auth");
const { update, putFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

const SHARE_MAX = 100 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, error: "자료명을 입력하세요." });
  if (!body.file && !body.url) return res.status(400).json({ ok: false, error: "파일을 선택하거나 주소를 입력하세요." });
  if (!isAdmin && !body.pw) return res.status(400).json({ ok: false, error: "비밀번호가 필요합니다." });
  if (!isAdmin && body.pw && String(body.pw).length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상이어야 합니다." });

  const id = genId("s");
  let fname = "", size = 0, fileUrl = "";
  if (body.file && body.file.data) {
    if ((body.file.size || 0) > SHARE_MAX) return res.status(400).json({ ok: false, error: "파일이 100MB를 초과합니다." });
    const buf = Buffer.from(body.file.data, "base64");
    const stored = await putFile(`share/${id}/${body.file.name}`, buf, mimeFor(body.file.name));
    fname = body.file.name; size = body.file.size || buf.length; fileUrl = stored.url;
  }

  await update("share", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.push({
      id, name, desc: String(body.desc || ""), who: String(body.who || ""),
      org: isAdmin ? String(body.org || "") : "",
      url: fileUrl ? "" : String(body.url || ""),
      fname, size, fileUrl,
      ts: nowIso(), ip: clientIp(req), pw: isAdmin ? null : hashSimplePw(body.pw),
    });
    return cur;
  });
  res.status(200).json({ ok: true, id });
};
