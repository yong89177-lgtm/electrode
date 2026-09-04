/* Vercel Blob과 똑같은 함수 시그니처를 제공하는 로컬 디스크 저장소.
   사내 PC/서버에서 node로 직접 실행할 때(= process.env.VERCEL 이 없을 때)
   blob.js가 이 모듈을 대신 사용한다. 외부 서비스가 전혀 필요 없다. */
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function dbFile(name) {
  return path.join(DATA_DIR, "db", `${name}.json`);
}

async function readJSON(name, fallback) {
  try {
    const raw = await fs.readFile(dbFile(name), "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(name, data) {
  const file = dbFile(name);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data), "utf8");
  return data;
}

/* 단일 프로세스로만 실행되므로(사내 서버에 node 하나만 띄움), 이 정도의
   순차 큐만으로도 완전히 안전한 read-modify-write가 보장된다. */
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

async function putFile(pathHint, buffer, contentType) {
  const dir = path.dirname(pathHint);
  const base = path.basename(pathHint);
  const rel = path.join("files", dir, `${crypto.randomBytes(6).toString("hex")}-${base}`);
  const full = path.join(DATA_DIR, rel);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, buffer);
  return { url: rel, pathname: rel };
}

async function fetchFile(url) {
  try {
    return await fs.readFile(path.join(DATA_DIR, url));
  } catch (e) {
    return null;
  }
}

async function deleteFile(url) {
  if (!url) return;
  try {
    await fs.unlink(path.join(DATA_DIR, url));
  } catch (e) {}
}

async function readRawText(name, fallback) {
  try {
    return await fs.readFile(path.join(DATA_DIR, "raw", name), "utf8");
  } catch (e) {
    return fallback;
  }
}

async function writeRawText(name, text) {
  const file = path.join(DATA_DIR, "raw", name);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, text, "utf8");
}

module.exports = { readJSON, writeJSON, update, putFile, fetchFile, deleteFile, readRawText, writeRawText };
