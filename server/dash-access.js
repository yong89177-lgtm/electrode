const { readBody, methodNotAllowed } = require("./_lib/http");
const { clientIp } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const { key, name, team } = await readBody(req);
  if (key) {
    const ip = clientIp(req);
    const today = new Date().toISOString().slice(0, 10);
    await update("dash_access", { agg: {} }, (cur) => {
      cur.agg = cur.agg || {};
      const a = (cur.agg[key] = cur.agg[key] || { name, team, total: 0, first: today, ips: {}, days: {} });
      a.name = name || a.name;
      a.team = team || a.team;
      a.total = (a.total || 0) + 1;
      if (!a.first) a.first = today;
      a.ips = a.ips || {};
      if (ip) a.ips[ip] = true;
      a.days = a.days || {};
      a.days[today] = (a.days[today] || 0) + 1;
      // 오래된 일별 카운트 정리 (35일 초과)
      const cutoff = Date.now() - 35 * 86400000;
      Object.keys(a.days).forEach((d) => {
        if (new Date(d).getTime() < cutoff) delete a.days[d];
      });
      return cur;
    });
  }
  res.status(204).end();
};
