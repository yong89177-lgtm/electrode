const MAP = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml",
  pdf: "application/pdf", txt: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", mp4: "video/mp4",
};
function mimeFor(filename) {
  const ext = String(filename || "").split(".").pop().toLowerCase();
  return MAP[ext] || "application/octet-stream";
}
module.exports = { mimeFor };
