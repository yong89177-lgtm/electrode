function sumLastNDays(days, n) {
  days = days || {};
  let sum = 0;
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    sum += days[d] || 0;
  }
  return sum;
}

function daysSince(dateStr) {
  if (!dateStr) return 1;
  const t = new Date(dateStr).getTime();
  const d = Math.max(1, Math.round((Date.now() - t) / 86400000) + 1);
  return d;
}

module.exports = { sumLastNDays, daysSince };
