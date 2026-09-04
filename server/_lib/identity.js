const { getSession, clientIp } = require("./auth");

/* 로그인 사용자는 세션ID, 아닌 경우 IP 기반 식별자를 좋아요 등에 사용한다. */
async function likeIdentity(req) {
  const s = await getSession(req);
  if (s) return "u:" + s.id;
  return "ip:" + clientIp(req);
}

async function displayIdentity(req, authorInput) {
  const s = await getSession(req);
  const { readJSON } = require("./blob");
  if (s) {
    const db = await readJSON("accounts", { items: [] });
    const acc = (db.items || []).find((a) => a.id === s.id);
    return { name: (acc && acc.name) || s.id, org: (acc && acc.org) || "", anon: false, session: s };
  }
  const author = String(authorInput || "").trim();
  if (author) return { name: author, org: "", anon: false, session: null };
  return { name: "익명", org: "", anon: true, session: null };
}

module.exports = { likeIdentity, displayIdentity };
