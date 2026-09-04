const { methodNotAllowed } = require("./_lib/http");
const { destroySession } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  await destroySession(req, res);
  res.status(200).json({ ok: true });
};
