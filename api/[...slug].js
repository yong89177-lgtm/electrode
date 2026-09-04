/* 단일 캐치올 함수. Vercel Hobby 플랜은 배포당 서버리스 함수 12개로 제한되는데,
   라우트마다 별도 파일(api/*.js)을 두면 60개가 넘어가 그 한도를 초과한다.
   그래서 실제 라우트 구현은 server/*.js에 두고, 배포되는 서버리스 함수는
   이 파일 하나뿐이다 — 라우트 테이블은 server/_lib/router.js를 공유한다
   (사내망 독립 실행형 서버인 standalone.js도 같은 테이블을 쓴다). */
const { parse: parseUrl } = require("url");
const { resolveHandler } = require("../server/_lib/router");

/* 라우트 이름을 두 가지 방식으로 찾는다.
   1) 경로 기반: "/api/login" 처럼 직접 요청된 경우 -> "login"
   2) 쿼리 기반: vercel.json의 "/" -> "/api/render" 리라이트를 거치면
      Vercel이 경로는 원래 요청("/")로 그대로 두고, 매칭된 동적 세그먼트를
      쿼리스트링에 붙여서 넘긴다 — 이때 키 이름은 "slug"가 아니라 파일명
      그대로인 "...slug" (점 3개 포함, 실측 확인됨). 정확한 키를 가정하지
      않도록 "slug"로 끝나는 키를 전부 찾는다. */
function findSlugValue(query) {
  if (!query) return null;
  for (const key of Object.keys(query)) {
    if (key === "slug" || key.endsWith("slug")) {
      const v = query[key];
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return null;
}
function routeNameFromUrl(reqUrl) {
  const parsed = parseUrl(String(reqUrl || ""), true);
  const parts = (parsed.pathname || "").split("/").filter(Boolean);
  if (parts[0] === "api" && parts.length === 2) return decodeURIComponent(parts[1]);
  return findSlugValue(parsed.query);
}

module.exports = async (req, res) => {
  let name = routeNameFromUrl(req.url);
  if (!name) name = findSlugValue(req.query);
  const handler = resolveHandler(name);
  if (!handler) {
    res.status(404).json({ ok: false, error: "알 수 없는 API 경로입니다.", path: req.url });
    return;
  }
  try {
    return await handler(req, res);
  } catch (e) {
    /* 라우트 핸들러가 예외를 던지면 Vercel이 일반 크래시 페이지(비-JSON)를
       돌려줘서, 브라우저 쪽 fetch().json()이 실패해 "서버에 연결할 수
       없습니다"라는 엉뚱한 메시지로 보인다. 항상 JSON으로 원인을 내려준다. */
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류가 발생했습니다.", route: name });
    }
  }
};
