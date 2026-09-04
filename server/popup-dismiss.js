const { readBody, methodNotAllowed } = require("./_lib/http");
const { parseCookies, setCookie } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const { id } = await readBody(req);
  if (id) {
    const set = new Set((parseCookies(req).mp_pdismiss || "").split(",").filter(Boolean));
    set.add(id);
    setCookie(res, "mp_pdismiss", [...set].slice(-200).join(","), { maxAge: 180 * 86400 });
  }
  res.status(200).json({ ok: true });
};
