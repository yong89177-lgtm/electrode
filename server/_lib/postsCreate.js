const { readBody } = require("./http");
const { genId, nowIso } = require("./http");
const { getSession, clientIp, hashSimplePw } = require("./auth");
const { update, putFile } = require("./blob");
const { mimeFor } = require("./mime");

async function createPost(req, res) {
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const body = await readBody(req);
  const title = String(body.title || "").trim();
  if (!title) return res.status(400).json({ ok: false, error: "제목을 입력하세요." });
  if (!isAdmin && !body.pw) return res.status(400).json({ ok: false, error: "게시 비밀번호가 필요합니다." });
  if (!isAdmin && body.pw && String(body.pw).length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상이어야 합니다." });

  const id = genId("p");
  const attachments = [];
  const files = Array.isArray(body.attachments) ? body.attachments : [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || !f.data) continue;
    const buf = Buffer.from(f.data, "base64");
    const stored = await putFile(`posts/${id}/${i}-${f.name}`, buf, mimeFor(f.name));
    attachments.push({ idx: i, name: f.name, size: f.size || buf.length, url: stored.url });
  }

  let category = String(body.category || "자유").trim() || "자유";
  if (category === "공지" && !isAdmin) category = "자유";

  await update("posts", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.push({
      id, title, body: String(body.body || ""), category,
      author: isAdmin ? me.id : (String(body.author || "").trim() || "익명"),
      ts: nowIso(), ip: clientIp(req), views: 0, likedBy: [], comments: [],
      attachments, pinned: isAdmin ? !!body.pinned : false,
      pw: isAdmin ? null : hashSimplePw(body.pw),
      ownerId: isAdmin ? me.id : null,
    });
    return cur;
  });
  res.status(200).json({ ok: true, id });
}

module.exports = { createPost };
