const { methodNotAllowed } = require("./_lib/http");
const { getSession } = require("./_lib/auth");
const { readJSON } = require("./_lib/blob");
const { likeIdentity } = require("./_lib/identity");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res);
  const me = await getSession(req);
  const isAdmin = me && me.role === "admin";
  const myId = await likeIdentity(req);
  const db = await readJSON("lounge", { items: [] });

  const posts = (db.items || [])
    .slice()
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .map((p) => ({
      id: p.id, name: p.name, org: p.org, anon: !!p.anon, tag: p.tag, text: p.text,
      ts: p.ts, edited: !!p.edited, ip: isAdmin ? p.ip : undefined,
      likes: (p.likedBy || []).length, liked: (p.likedBy || []).includes(myId),
      attachments: (p.attachments || []).map(({ url, ...rest }) => rest),
      replies: (p.replies || []).map((r) => ({
        id: r.id, name: r.name, org: r.org, anon: !!r.anon, text: r.text, ts: r.ts,
        edited: !!r.edited, ip: isAdmin ? r.ip : undefined,
      })),
    }));
  res.status(200).json({ ok: true, posts });
};
