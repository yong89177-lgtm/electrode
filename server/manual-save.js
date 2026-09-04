const { readBody, methodNotAllowed, genId } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update, putFile, deleteFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const body = await readBody(req);
  const title = String(body.title || "").trim();
  if (!title) return res.status(400).json({ ok: false, error: "제목을 입력하세요." });
  if (!body.id && !(body.file && body.file.data)) {
    return res.status(400).json({ ok: false, error: "파일을 선택하세요." });
  }

  let errorOut = null, oldFileUrl = null;
  await update("manuals", { items: [] }, async (cur) => {
    cur.items = cur.items || [];
    let m = body.id ? cur.items.find((x) => x.id === body.id) : null;
    if (body.id && !m) { errorOut = "매뉴얼을 찾을 수 없습니다."; return cur; }
    if (!m) {
      m = { id: genId("man"), fileUrl: "", filename: "", size: 0 };
      cur.items.unshift(m);
    }
    m.title = title;
    if (body.file && body.file.data) {
      oldFileUrl = m.fileUrl || null;
      const buf = Buffer.from(body.file.data, "base64");
      const stored = await putFile(`manuals/${m.id}/${body.file.name}`, buf, mimeFor(body.file.name));
      m.fileUrl = stored.url; m.filename = body.file.name; m.size = body.file.size || buf.length;
    }
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  if (oldFileUrl) await deleteFile(oldFileUrl);
  res.status(200).json({ ok: true });
};
