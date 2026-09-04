const { readBody, methodNotAllowed } = require("./_lib/http");
const { getSession, verifyPw } = require("./_lib/auth");
const { update, putFile, deleteFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const body = await readBody(req);
  const { id } = body;
  if (!id) return res.status(400).json({ ok: false, error: "id가 필요합니다." });

  let errorOut = null;
  let toDelete = [];
  await update("posts", { items: [] }, async (cur) => {
    const p = (cur.items || []).find((x) => x.id === id);
    if (!p) { errorOut = "게시글을 찾을 수 없습니다."; return cur; }
    if (!isAdmin && !verifyPw(body.pw, p.pw)) { errorOut = "비밀번호가 일치하지 않습니다."; return cur; }

    const title = String(body.title || "").trim();
    if (!title) { errorOut = "제목을 입력하세요."; return cur; }

    const keep = Array.isArray(body.keep) ? body.keep.map(Number) : [];
    const kept = (p.attachments || []).filter((a) => keep.includes(a.idx));
    toDelete = (p.attachments || []).filter((a) => !keep.includes(a.idx));

    let nextIdx = kept.reduce((m, a) => Math.max(m, a.idx), -1) + 1;
    const newFiles = Array.isArray(body.attachments) ? body.attachments : [];
    for (const f of newFiles) {
      if (!f || !f.data) continue;
      const buf = Buffer.from(f.data, "base64");
      const stored = await putFile(`posts/${id}/${nextIdx}-${f.name}`, buf, mimeFor(f.name));
      kept.push({ idx: nextIdx, name: f.name, size: f.size || buf.length, url: stored.url });
      nextIdx++;
    }

    p.title = title;
    p.body = String(body.body || "");
    if (body.category) p.category = (body.category === "공지" && !isAdmin) ? "자유" : body.category;
    if (isAdmin && body.pinned !== undefined) p.pinned = !!body.pinned;
    p.attachments = kept;
    return cur;
  });

  for (const a of toDelete) await deleteFile(a.url);
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  res.status(200).json({ ok: true });
};
