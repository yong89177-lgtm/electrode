/* 모든 데이터(JSON 문서 + 첨부파일)를 Vercel Blob에 저장하는 공용 래퍼.
   BLOB_PATH_SECRET 을 경로 접두어로 사용해, 블롭이 public 접근이어도
   URL을 추측하지 못하면 값을 읽을 수 없도록 한다. 클라이언트에는 절대
   원본 블롭 URL을 내려주지 않고, 항상 /api/* 라우트가 대신 스트리밍한다. */
const { put, del, head } = require("@vercel/blob");

function prefix() {
  const s = process.env.BLOB_PATH_SECRET;
  if (!s) throw new Error("환경변수 BLOB_PATH_SECRET 이 설정되지 않았습니다.");
  return s;
}

function dbPath(name) {
  return `${prefix()}/db/${name}.json`;
}

const jsonCache = new Map();

async function readJSON(name, fallback) {
  const path = dbPath(name);
  try {
    const info = await head(path).catch(() => null);
    if (!info) return fallback;
    const r = await fetch(info.url, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(name, data) {
  const path = dbPath(name);
  await put(path, JSON.stringify(data), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return data;
}

/* 동시 요청으로 인한 read-modify-write 유실을 줄이기 위한 아주 단순한 직렬화.
   콜드스타트마다 인스턴스가 다시 생성되므로 완전한 락은 아니지만,
   같은 실행 인스턴스 내 연속 호출은 안전하게 순서를 보장한다. */
const chains = new Map();
function update(name, fallback, mutator) {
  const prev = chains.get(name) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const cur = await readJSON(name, fallback);
      const out = await mutator(cur);
      const toSave = out === undefined ? cur : out;
      await writeJSON(name, toSave);
      return toSave;
    });
  chains.set(name, next);
  return next;
}

async function readRawText(name, fallback) {
  const path = `${prefix()}/raw/${name}`;
  try {
    const info = await head(path).catch(() => null);
    if (!info) return fallback;
    const r = await fetch(info.url, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.text();
  } catch (e) {
    return fallback;
  }
}

async function writeRawText(name, text, contentType) {
  const path = `${prefix()}/raw/${name}`;
  await put(path, text, {
    access: "public",
    contentType: contentType || "text/plain; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

async function putFile(pathHint, buffer, contentType) {
  const path = `${prefix()}/files/${pathHint}`;
  const blob = await put(path, buffer, {
    access: "public",
    contentType: contentType || "application/octet-stream",
    addRandomSuffix: true,
  });
  return { url: blob.url, pathname: blob.pathname };
}

async function fetchFile(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf;
}

async function deleteFile(url) {
  if (!url) return;
  try {
    await del(url);
  } catch (e) {}
}

module.exports = { readJSON, writeJSON, update, putFile, fetchFile, deleteFile, readRawText, writeRawText };
