const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { getSession, findAccount } = require("./_lib/auth");
const { update, putFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, error: "대시보드명을 입력하세요." });
  if (body.html && Buffer.byteLength(String(body.html), "utf8") > 3 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: "HTML 파일이 너무 큽니다 (3MB 이하만 가능)." });
  }

  const me = await getSession(req);
  let requesterName = String(body.author || "").trim();
  let requesterOrg = String(body.org || "").trim();
  let requesterId = "";
  if (me) {
    requesterId = me.id;
    const acc = await findAccount(me.id);
    if (acc) {
      requesterName = requesterName || acc.name || "";
      requesterOrg = requesterOrg || acc.org || "";
    }
  }

  const id = genId("q");
  let fileUrl = "", fname = "";
  if (body.html) {
    const buf = Buffer.from(String(body.html), "utf8");
    fname = body.fname || "요청.html";
    const stored = await putFile(`dash-requests/${id}/${fname}`, buf, "text/html; charset=utf-8");
    fileUrl = stored.url;
  }

  await update("dash_requests", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.push({
      id, name, desc: String(body.desc || ""), org: requesterOrg,
      features: Array.isArray(body.features) ? body.features : [],
      etc: String(body.etc || ""),
      requester: requesterId, requesterName, requesterOrg,
      fileUrl, fname,
      ts: nowIso(), status: "pending", stage1: null, stage2: null,
    });
    return cur;
  });
  res.status(200).json({ ok: true, id });
};
