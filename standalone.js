/*
 * 사내망 PC/서버에서 직접 실행하는 독립형 서버.
 * Vercel도, Vercel Blob도, 외부 서비스도 전혀 필요 없다 — 이 파일 하나로
 * MAPS 포털 전체(웹페이지 + 모든 api/*)가 뜬다. 데이터는 옆에 생기는
 * data/ 폴더(로컬 디스크)에 저장된다.
 *
 * 실행법:
 *   1) node 18 이상 설치
 *   2) npm install
 *   3) 이 폴더에 .env 파일을 만들고 최소한 ADMIN_PASSWORD를 채운다
 *      (.env.example 참고)
 *   4) node standalone.js   (또는 npm start)
 *   5) 이 서버의 사내망 IP로 접속: http://<이 PC의 IP>:8081
 *      (PORT는 .env의 PORT로 바꿀 수 있다)
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parse: parseUrl } = require("url");
const { resolveHandler } = require("./server/_lib/router");

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) out.push({ name, address: net.address });
    }
  }
  return out;
}

/* --- 아주 작은 .env 로더 (별도 패키지 불필요) --- */
(function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) return;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  });
})();

if (!process.env.ADMIN_PASSWORD) {
  console.error("환경변수 ADMIN_PASSWORD가 설정되지 않았습니다. .env 파일을 만들고 ADMIN_PASSWORD=원하는비밀번호 를 추가한 뒤 다시 실행하세요. (.env.example 참고)");
  process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10) || 8081;
const HOST = process.env.HOST || "0.0.0.0";

const STATIC = {
  "/hero-bg.mp4": { file: path.join(__dirname, "hero-bg.mp4"), type: "video/mp4" },
};

/* 영상/대용량 파일은 Range 요청(구간 요청)을 반드시 지원해야 한다 — 이게 없으면
   브라우저가 스트리밍 대신 매번 파일 전체를 새로 받으려 하고, loop 재생 때마다
   이 과정이 반복되면서 사내망처럼 느린 구간에서 버퍼링·끊김이 심해진다. */
function serveStaticFile(req, res, entry) {
  fs.stat(entry.file, (err, stat) => {
    if (err) { res.status(404).send("Not found"); return; }
    const total = stat.size;
    res.setHeader("Content-Type", entry.type);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Length", total);
      fs.createReadStream(entry.file).pipe(res);
      return;
    }

    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    if (!m || isNaN(start) || isNaN(end) || start > end || end >= total) {
      res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    res.setHeader("Content-Length", end - start + 1);
    fs.createReadStream(entry.file, { start, end }).pipe(res);
  });
}

function wrapRes(res) {
  res.status = function (c) { res.statusCode = c; return res; };
  res.json = function (o) {
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(o));
    return res;
  };
  res.send = function (o) {
    if (Buffer.isBuffer(o)) { res.end(o); return res; }
    if (typeof o === "string") {
      if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(o);
      return res;
    }
    return res.json(o);
  };
  return res;
}

const MAX_BODY = 150 * 1024 * 1024; // 150MB — 첨부파일 업로드 여유분

function readReqBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("요청 용량이 너무 큽니다."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json") && raw.length) {
        try { resolve(JSON.parse(raw.toString("utf8"))); return; } catch (e) { resolve({}); return; }
      }
      resolve(raw.length ? raw.toString("utf8") : undefined);
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  wrapRes(res);
  const parsed = parseUrl(req.url, true);
  const pathname = parsed.pathname;
  req.query = parsed.query;

  const staticEntry = STATIC[pathname];
  if (staticEntry) {
    serveStaticFile(req, res, staticEntry);
    return;
  }

  try {
    req.body = await readReqBody(req);
  } catch (e) {
    res.status(413).json({ ok: false, error: e.message });
    return;
  }

  try {
    if (pathname === "/" || pathname === "/index.html") {
      return await require("./server/render.js")(req, res);
    }
    if (pathname === "/data/dashboards.json") {
      return await require("./server/dashboards-data.js")(req, res);
    }
    if (pathname.startsWith("/api/")) {
      const name = pathname.slice("/api/".length);
      const handler = resolveHandler(name);
      if (!handler) { res.status(404).json({ ok: false, error: "알 수 없는 API 경로입니다." }); return; }
      return await handler(req, res);
    }
    res.status(404).send("Not found");
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ${pathname} 처리 중 오류:`, e);
    if (!res.headersSent) res.status(500).json({ ok: false, error: e.message || "서버 오류가 발생했습니다." });
  }
});

server.listen(PORT, HOST, () => {
  console.log("MAPS 서버 실행 중");
  console.log(`이 PC에서 확인: http://localhost:${PORT}`);
  if (HOST === "0.0.0.0") {
    const addrs = lanAddresses();
    if (addrs.length) {
      console.log("다른 사람에게 공유할 주소:");
      addrs.forEach((a) => console.log(`  http://${a.address}:${PORT}   (${a.name})`));
    } else {
      console.log("이 PC의 사내망 IP를 찾지 못했습니다 — ipconfig(Windows)로 직접 확인해주세요.");
    }
  }
  console.log(`데이터 저장 위치: ${process.env.DATA_DIR || path.join(__dirname, "data")}`);
});
