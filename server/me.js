const { getSession } = require("./_lib/auth");

module.exports = async (req, res) => {
  const s = await getSession(req);
  if (!s) return res.status(200).json({ auth: false });
  res.status(200).json({ auth: true, id: s.id, role: s.role });
};
