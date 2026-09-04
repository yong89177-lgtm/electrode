const { methodNotAllowed } = require("./_lib/http");
const { clientIp } = require("./_lib/auth");
const { update } = require("./_lib/blob");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const ip = clientIp(req);
  const today = new Date().toISOString().slice(0, 10);
  await update("site_visits", { total: 0, days: {}, ips: {} }, (cur) => {
    cur.total = (cur.total || 0) + 1;
    cur.days = cur.days || {};
    cur.days[today] = (cur.days[today] || 0) + 1;
    const cutoff = Date.now() - 35 * 86400000;
    Object.keys(cur.days).forEach((d) => {
      if (new Date(d).getTime() < cutoff) delete cur.days[d];
    });
    cur.ips = cur.ips || {};
    if (ip) cur.ips[ip] = today;
    return cur;
  });
  res.status(204).end();
};
