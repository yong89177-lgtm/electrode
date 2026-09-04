const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update, putFile, deleteFile } = require("./_lib/blob");
const { mimeFor } = require("./_lib/mime");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!(await requireAdmin(req, res))) return;
  const body = await readBody(req);

  let errorOut = null, oldImageUrl = null;
  await update("popups", { items: [] }, async (cur) => {
    cur.items = cur.items || [];
    let p = body.id ? cur.items.find((x) => x.id === body.id) : null;
    if (body.id && !p) { errorOut = "팝업을 찾을 수 없습니다."; return cur; }
    if (!p) {
      p = { id: genId("pp"), ts: nowIso(), imageUrl: "", imageName: "" };
      cur.items.unshift(p);
    }
    p.title = String(body.title || "");
    p.start = String(body.start || "");
    p.end = String(body.end || "");
    p.active = !!body.active;
    if (body.image && body.image.data) {
      oldImageUrl = p.imageUrl || null;
      const buf = Buffer.from(body.image.data, "base64");
      const stored = await putFile(`popups/${p.id}/${body.image.name}`, buf, mimeFor(body.image.name));
      p.imageUrl = stored.url;
      p.imageName = body.image.name;
    }
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });
  if (oldImageUrl) await deleteFile(oldImageUrl);
  res.status(200).json({ ok: true });
};
