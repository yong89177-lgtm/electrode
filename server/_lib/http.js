const crypto = require("crypto");

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (e) {
      return {};
    }
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function genId(prefix) {
  return (prefix || "") + Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
}

function methodNotAllowed(res) {
  res.status(405).json({ ok: false, error: "허용되지 않은 메서드입니다." });
}

function nowIso() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

module.exports = { readBody, genId, methodNotAllowed, nowIso };
