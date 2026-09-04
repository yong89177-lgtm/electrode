const crypto = require("crypto");
const { readJSON, update } = require("./blob");

const SESSION_COOKIE = "maps_sid";
const SESSION_TTL_MS = 12 * 3600 * 1000; // 12시간

function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPw(pw, stored) {
  if (!stored || stored.indexOf(":") === -1) return false;
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(String(pw || ""), salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
  } catch (e) {
    return false;
  }
}
function hashSimplePw(pw) {
  // 게시글/댓글/라운지 글의 익명 비밀번호(4자 이상)용 — 계정 비밀번호와 동일 방식
  return hashPw(pw);
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers && req.headers.cookie;
  if (!raw) return out;
  raw.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i === -1) return;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function setCookie(res, name, value, opts) {
  opts = opts || {};
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || "/"}`);
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.maxAge === 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  parts.push("HttpOnly");
  parts.push("SameSite=Lax");
  if (process.env.VERCEL) parts.push("Secure");
  const prev = res.getHeader("Set-Cookie");
  const line = parts.join("; ");
  if (!prev) res.setHeader("Set-Cookie", [line]);
  else res.setHeader("Set-Cookie", (Array.isArray(prev) ? prev : [prev]).concat(line));
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "";
}

async function bootstrapAccounts() {
  return update("accounts", { items: [] }, (cur) => {
    if (cur.items && cur.items.length) return cur;
    const id = process.env.ADMIN_ID || "admin";
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) {
      throw new Error(
        "초기 관리자 계정을 만들 수 없습니다. Vercel 환경변수 ADMIN_PASSWORD 를 설정하세요."
      );
    }
    cur.items = [
      { id, pw: hashPw(pw), role: "admin", name: "관리자", org: "", empno: "", createdAt: new Date().toISOString() },
    ];
    return cur;
  });
}

async function findAccount(id) {
  await bootstrapAccounts();
  const db = await readJSON("accounts", { items: [] });
  return (db.items || []).find((a) => a.id === id) || null;
}

async function createSession(account, req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const exp = Date.now() + SESSION_TTL_MS;
  await update("sessions", { items: {} }, (cur) => {
    cur.items = cur.items || {};
    // 만료 세션 정리
    Object.keys(cur.items).forEach((k) => {
      if (!cur.items[k] || cur.items[k].exp < Date.now()) delete cur.items[k];
    });
    cur.items[token] = { id: account.id, role: account.role, exp };
    return cur;
  });
  setCookie(res, SESSION_COOKIE, token, { maxAge: Math.floor(SESSION_TTL_MS / 1000) });
  return token;
}

async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    await update("sessions", { items: {} }, (cur) => {
      if (cur.items) delete cur.items[token];
      return cur;
    });
  }
  setCookie(res, SESSION_COOKIE, "", { maxAge: 0 });
}

async function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const db = await readJSON("sessions", { items: {} });
  const s = db.items && db.items[token];
  if (!s || s.exp < Date.now()) return null;
  return { token, id: s.id, role: s.role };
}

async function requireAuth(req, res) {
  const s = await getSession(req);
  if (!s) {
    res.status(401).json({ ok: false, error: "로그인이 필요합니다." });
    return null;
  }
  return s;
}

async function requireAdmin(req, res) {
  const s = await getSession(req);
  if (!s || s.role !== "admin") {
    res.status(403).json({ ok: false, error: "관리자만 사용할 수 있습니다." });
    return null;
  }
  return s;
}

module.exports = {
  hashPw,
  verifyPw,
  hashSimplePw,
  parseCookies,
  setCookie,
  clientIp,
  bootstrapAccounts,
  findAccount,
  createSession,
  destroySession,
  getSession,
  requireAuth,
  requireAdmin,
};
