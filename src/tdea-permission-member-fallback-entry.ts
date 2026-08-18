import app from './roster-single-crud-entry';

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, unknown>;

const MANAGER_KEY = 'manager/state.json';
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const memberNoOf = (row: Row) => clean(row.memberNo || row.rosterMemberNo || row.member_no, 100).toUpperCase();
const lineUidOf = (row: Row) => clean(row.lineUserId || row.LINE_user_id || row.uid || row.lineUid || row.line_user_id, 256);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function loginAllowed(row: Row) {
  const values = [row.loginAccess, row.loginAllowed, row.allowLogin, row.canLogin, row.adminAccess];
  if (values.some((value) => value === true)) return true;
  return values.some((value) => ['1', 'TRUE', 'Y', 'YES', 'ALLOW', 'ALLOWED', '允許', '啟用'].includes(clean(value, 30).toUpperCase()));
}

async function adminSubjects(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.hostname !== 'tdea-permission.internal') return json({ success: false, message: 'Not found' }, 404);
  if (!env.ASSETS_BUCKET) return json({ success: false, message: 'R2 bucket is not configured' }, 503);

  const object = await env.ASSETS_BUCKET.get(MANAGER_KEY);
  const data = object ? await object.json().catch(() => ({})) as Record<string, unknown> : {};
  const rows: Row[] = ['association', 'vendor'].flatMap((type) =>
    Array.isArray(data?.[type])
      ? (data[type] as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
      : []
  );
  const members = rows
    .filter(loginAllowed)
    .map((row) => ({ memberNo: memberNoOf(row), lineUserId: lineUidOf(row) }))
    .filter((row) => row.memberNo || /^U[0-9a-f]{32}$/i.test(row.lineUserId));
  const lineUserIds = Array.from(new Set(members.map((row) => row.lineUserId).filter((uid) => /^U[0-9a-f]{32}$/i.test(uid))));

  return json({ success: true, members, lineUserIds, total: members.length, source: MANAGER_KEY });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/internal/tdea-design/admin-subjects') {
      try { return await adminSubjects(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    return app.fetch(request, env as never, ctx);
  },
};
