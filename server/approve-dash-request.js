const { readBody, methodNotAllowed, nowIso } = require("./_lib/http");
const { requireAdmin } = require("./_lib/auth");
const { update } = require("./_lib/blob");
const FALLBACK = require("./_lib/fallback-dashboards");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const s = await requireAdmin(req, res);
  if (!s) return;
  const { id, approve, reason } = await readBody(req);
  if (!approve && !String(reason || "").trim()) {
    return res.status(400).json({ ok: false, error: "반려 사유가 필요합니다." });
  }

  let errorOut = null;
  let finalApproved = null; // 2차 승인이 방금 확정된 경우, 타일 생성에 필요한 정보를 담아둔다
  await update("dash_requests", { items: [] }, (cur) => {
    const q = (cur.items || []).find((x) => x.id === id);
    if (!q) { errorOut = "요청을 찾을 수 없습니다."; return cur; }

    if (q.status === "pending") {
      // 1차 IT 검토 — 관리자 누구나
      q.stage1 = { by: s.id, ts: nowIso(), decision: approve ? "approved" : "rejected", reason: reason || "" };
      q.status = approve ? "it_approved" : "rejected";
    } else if (q.status === "it_approved") {
      // 2차 적절성 검토 — 관리자 누구나 (1차와 같은 관리자도 가능)
      q.stage2 = { by: s.id, ts: nowIso(), decision: approve ? "approved" : "rejected", reason: reason || "" };
      q.status = approve ? "approved" : "rejected";
      if (q.status === "approved") {
        finalApproved = {
          id: q.id, name: q.name, desc: q.desc, org: q.org,
          owner: q.requesterName || q.requesterOrg || "",
          features: q.features || [], fileUrl: q.fileUrl,
        };
      }
    } else {
      errorOut = "이미 처리된 요청입니다.";
    }
    return cur;
  });
  if (errorOut) return res.status(400).json({ ok: false, error: errorOut });

  let placed = null;
  if (finalApproved && finalApproved.fileUrl) {
    const category = finalApproved.features[0]; // 요청 시 체크한 카테고리 중 첫번째
    if (category) {
      await update("dashboards", FALLBACK, (state) => {
        state.columns = state.columns || [];
        let col = state.columns.find((c) => c.team === category);
        if (!col) { col = { team: category, tag: "", items: [] }; state.columns.push(col); }
        col.items = col.items || [];
        const already = col.items.some((it) => it.name === finalApproved.name);
        if (!already) {
          const nextOrder = col.items.reduce((m, it) => Math.max(m, +it.order || 0), 0) + 1;
          col.items.push({
            name: finalApproved.name, desc: finalApproved.desc || "", owner: finalApproved.owner,
            addr: `/api/agent?id=${finalApproved.id}`, order: nextOrder, org: finalApproved.org || "", likes: 0,
          });
          placed = category;
        }
        return state;
      });
    }
  }

  res.status(200).json({ ok: true, placed });
};
