/* 루트("/")와 "/index.html" 요청이 vercel.json 리라이트로 여기 온다.
   관리자 콘솔의 "HTML 업데이트"가 실제로 반영되도록, 정적 파일이 아니라
   Blob에 저장된 최신 HTML을 매 요청마다 내려준다. 아직 아무도 업데이트한
   적이 없으면 배포에 포함된 deploy/index.html 을 초기값으로 사용한다. */
const fs = require("fs");
const path = require("path");
const { readRawText } = require("./_lib/blob");

let bundled = null;
function bundledHtml() {
  if (bundled) return bundled;
  try {
    bundled = fs.readFileSync(path.join(process.cwd(), "deploy", "index.html"), "utf8");
  } catch (e) {
    bundled = "<!doctype html><meta charset='utf-8'><title>MAPS</title><p>초기 HTML 파일을 찾을 수 없습니다.</p>";
  }
  return bundled;
}

module.exports = async (req, res) => {
  const html = await readRawText("site-current.html", null);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(html || bundledHtml());
};
