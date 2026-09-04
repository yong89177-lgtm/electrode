const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { clientIp, hashSimplePw } = require("./_lib/auth");
const { update, putFile } = require("./_lib/blob");
const { displayIdentity } = require("./_lib/identity");
const { mimeFor } = require("./_lib/mime");

const LG_MAX = 100 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const body = await readBody(req);
  const text = String(body.text || "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "내용을 입력하세요." });
  const who = await displayIdentity(req, body.author);
  const isAdmin = who.session && who.session.role === "admin";
  if (!isAdmin && !body.pw) return res.status(400).json({ ok: false, error: "비밀번호가 필요합니다." });
  if (!isAdmin && body.pw && String(body.pw).length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상이어야 합니다." });

  const files = Array.isArray(body.attachments) ? body.attachments : [];
  const total = files.reduce((s, f) => s + (f.size || 0), 0);
  if (total > LG_MAX) return res.status(400).json({ ok: false, error: "첨부 합계가 100MB를 초과합니다." });

  const id = genId("l");
  const attachments = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || !f.data) continue;
    const buf = Buffer.from(f.data, "base64");
    const stored = await putFile(`lounge/${id}/${i}-${f.name}`, buf, mimeFor(f.name));
    attachments.push({ idx: i, name: f.name, size: f.size || buf.length, url: stored.url });
  }

  await update("lounge", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.push({
      id, name: who.name, org: who.org, anon: who.anon,
      tag: String(body.tag || "잡담"), text, ts: nowIso(), ip: clientIp(req),
      pw: isAdmin ? null : hashSimplePw(body.pw), likedBy: [], attachments, replies: [],
    });
    return cur;
  });
  res.status(200).json({ ok: true, id });
};
