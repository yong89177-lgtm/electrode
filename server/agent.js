/* 승인된 대시보드 등록요청에 첨부된 HTML을 그대로 서빙한다.
   대시보드 타일의 "주소"가 이 경로(/api/agent?id=...)를 가리키도록
   approve-dash-request.js가 자동으로 채워준다. */
const { readJSON, fetchFile } = require("./_lib/blob");

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || "";
  const db = await readJSON("dash_requests", { items: [] });
  const q = (db.items || []).find((x) => x.id === id);
  if (!q || q.status !== "approved" || !q.fileUrl) {
    return res.status(404).send("<!doctype html><meta charset='utf-8'><p>등록된 페이지를 찾을 수 없습니다.</p>");
  }
  const buf = await fetchFile(q.fileUrl);
  if (!buf) return res.status(404).send("<!doctype html><meta charset='utf-8'><p>파일을 찾을 수 없습니다.</p>");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(buf);
};
