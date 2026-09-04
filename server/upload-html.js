const { readBody, methodNotAllowed, genId, nowIso } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { writeRawText, update, putFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const s = await requireAdmin(req, res);
  if (!s) return;
  const { version, html, note } = await readBody(req);
  if (!version || !html) return res.status(400).json({ ok: false, error: "버전명과 HTML이 필요합니다." });
  if (Buffer.byteLength(html, "utf8") > 4 * 1024 * 1024) {
    return res.status(400).json({
      ok: false,
      error: "HTML이 4MB를 초과합니다 (Vercel 서버리스 함수 응답 제한). 동영상 등 큰 미디어는 base64로 문서에 넣지 말고 별도 파일/링크로 참조하세요.",
    });
  }

  // 새로 올린 버전을 이력(다운로드 가능한 백업)으로 남긴다
  const id = genId("h");
  const backup = await putFile(`html-backups/${id}.html`, Buffer.from(html, "utf8"), "text/html; charset=utf-8");
  await update("html_history", { items: [] }, (cur) => {
    cur.items = cur.items || [];
    cur.items.unshift({
      id,
      ts: nowIso(),
      version,
      note: note || "",
      by: s.id,
      size: Buffer.byteLength(html, "utf8"),
      url: backup.url,
    });
    cur.items = cur.items.slice(0, 100);
    return cur;
  });

  await writeRawText("site-current.html", html, "text/html; charset=utf-8");
  res.status(200).json({ ok: true, version });
};
