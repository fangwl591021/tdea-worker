import app from './tdea-design-telemetry-entry';

type Env = {
  ASSETS?: Fetcher;
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

const MARQUEE_KEY = 'line/marquee.json';
const MARQUEE_LIFF_URL = 'https://liff.line.me/2005868456-cfANNVou?marquee=1';
let marqueeCache: { data: Record<string, unknown>; expiresAt: number; staleUntil: number } | null = null;

function mergedParams(url: URL) {
  const params = new URLSearchParams(url.search);
  const state = params.get('liff.state');
  if (state) {
    let raw = state;
    for (let i = 0; i < 2; i += 1) {
      try {
        const next = decodeURIComponent(raw);
        if (next === raw) break;
        raw = next;
      } catch { break; }
    }
    const query = raw.startsWith('?') ? raw.slice(1) : raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;
    try {
      new URLSearchParams(query).forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
    } catch {}
  }
  return params;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout:${ms}`)), ms)),
  ]);
}

async function readMarqueeFast(env: Env) {
  const now = Date.now();
  if (marqueeCache && marqueeCache.expiresAt > now) return { data: marqueeCache.data, cache: 'memory' };
  if (!env.ASSETS_BUCKET) return null;

  try {
    const object = await timeout(env.ASSETS_BUCKET.get(MARQUEE_KEY), 1800);
    if (!object) {
      if (marqueeCache && marqueeCache.staleUntil > now) return { data: marqueeCache.data, cache: 'stale' };
      return null;
    }
    const parsed = await timeout(object.json<Record<string, unknown>>(), 1200);
    const data = parsed && typeof parsed === 'object' ? parsed : {};
    marqueeCache = { data, expiresAt: now + 30_000, staleUntil: now + 10 * 60_000 };
    return { data, cache: 'r2' };
  } catch {
    if (marqueeCache && marqueeCache.staleUntil > now) return { data: marqueeCache.data, cache: 'stale' };
    return null;
  }
}

async function serveMarqueePage(request: Request, env: Env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return null;
  const original = new URL(request.url);
  const assetUrl = new URL('/marquee.html', original.origin);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET', headers: request.headers }));
  if (!response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  headers.delete('content-length');
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const params = mergedParams(url);
    const marqueeMode = params.has('marquee');

    if (request.method === 'GET' && url.pathname === '/api/marquee') {
      const fast = await readMarqueeFast(env);
      if (fast) return json({ success: true, data: fast.data, liffUrl: MARQUEE_LIFF_URL }, 200, { 'x-marquee-source': fast.cache });
      return json({ success: false, message: '廣告資料暫時無法讀取，請稍後重試' }, 503);
    }

    if (request.method === 'GET' && marqueeMode && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/marquee')) {
      const page = await serveMarqueePage(request, env);
      if (page) return page;
    }

    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  },
};
