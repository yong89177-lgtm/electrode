function serialize(items) {
  return (items || [])
    .slice()
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .map((q) => ({
      id: q.id, name: q.name, desc: q.desc, org: q.org, features: q.features || [], etc: q.etc,
      requester: q.requester, requesterName: q.requesterName, requesterOrg: q.requesterOrg,
      ts: q.ts, status: q.status, stage1: q.stage1 || null, stage2: q.stage2 || null,
      file: !!q.fileUrl,
    }));
}
module.exports = { serialize };
