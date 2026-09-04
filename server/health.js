/* 대시보드 주소는 대부분 사내망 전용 IP/URL이라 Vercel(퍼블릭 클라우드)에서
   직접 접속성을 검사할 수 없다. 그래서 상태는 항상 "ok"이고, 관리자가
   수동으로 표시한 유예(waive) 정보만 관리한다. 실제 장애 감지를 붙이려면
   사내망에서 주기적으로 이 값을 갱신하는 별도 크론/에이전트가 필요하다. */
const { readJSON } = require("./_lib/blob");

module.exports = async (req, res) => {
  const db = await readJSON("health", { items: {} });
  const items = {};
  Object.keys(db.items || {}).forEach((key) => {
    const h = db.items[key];
    if (h.waiveUntil && new Date(h.waiveUntil).getTime() < Date.now()) return;
    items[key] = { state: "ok", waived: !!h.waived, waiveUntil: h.waiveUntil || "" };
  });
  res.status(200).json({ ok: true, items });
};
