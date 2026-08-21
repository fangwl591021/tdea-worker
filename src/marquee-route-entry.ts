import app from './tdea-design-telemetry-entry';

type Env = {
  ASSETS?: Fetcher;
  [key: string]: unknown;
};

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
