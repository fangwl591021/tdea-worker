import app from './marquee-route-entry';

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

type AdminAccessRecord = {
  memberNo?: string;
  lineUserId?: string;
  name?: string;
  loginAccess?: boolean;
};

const ACCESS_KEY = 'line/admin-access.json';
const clean = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

function trustedPointOperatorRequest(request: Request, url: URL) {
  return url.hostname === 'tdeawork.internal'
    && clean(request.headers.get('x-tdea-source'), 120) === 'tdea-design-point-operator';
}

async function memberNoAccess(env: Env, memberNo: string) {
  if (!env.ASSETS_BUCKET || !memberNo) return null;
  const object = await env.ASSETS_BUCKET.get(ACCESS_KEY);
  if (!object) return null;
  const raw = await object.json<Record<string, AdminAccessRecord>>().catch(() => ({}));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const target = memberNo.toUpperCase();
  const direct = raw[target];
  if (direct?.loginAccess === true) return direct;
  return Object.values(raw).find((record) =>
    record?.loginAccess === true && clean(record.memberNo, 120).toUpperCase() === target
  ) || null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === 'POST'
      && url.pathname === '/api/admin-login/line'
      && trustedPointOperatorRequest(request, url)) {
      const clone = request.clone();
      const body = await clone.json<Record<string, unknown>>().catch(() => ({}));
      const memberNo = clean(body.memberNo, 120).toUpperCase();

      // Keep the existing LINE UID authorization as the primary path.
      const primary = await app.fetch(request, env as never, ctx);
      if (primary.ok || !memberNo) return primary;

      // Only the trusted TDEA-DESIGN service-binding call may fall back to the
      // explicit back-office "允許登入" record by member number.
      const record = await memberNoAccess(env, memberNo);
      if (!record) return primary;

      return json({
        success: true,
        data: {
          lineUserId: clean(body.lineUserId, 256),
          displayName: clean(body.displayName || record.name, 160),
          memberNo,
          matchedBy: 'memberNo',
          loginAccess: true,
        },
      });
    }

    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  },
};
