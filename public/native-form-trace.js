(() => {
  if (window.__tdeaNativeTraceInstalled) return;
  window.__tdeaNativeTraceInstalled = true;

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const merge = (rawValue) => {
      if (!rawValue) return;
      let raw = rawValue;
      for (let i = 0; i < 2; i += 1) {
        try {
          const decoded = decodeURIComponent(raw);
          if (decoded === raw) break;
          raw = decoded;
        } catch { break; }
      }
      const query = raw.startsWith('?') ? raw.slice(1) : raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;
      new URLSearchParams(query).forEach((value, key) => { if (!output.has(key)) output.set(key, value); });
    };
    merge(output.get('liff.state'));
    if (location.hash) merge(location.hash.replace(/^#/, ''));
    return output;
  }

  const params = mergedParams();
  const TRACE_KEY = 'tdea_cross_app_trace';
  const TITLE_KEY = 'tdea_cross_app_activity_title';
  const trace = String(params.get('tdeaTrace') || sessionStorage.getItem(TRACE_KEY) || '').trim().slice(0, 120);
  const activityTitle = String(params.get('tdeaActivityTitle') || sessionStorage.getItem(TITLE_KEY) || '').trim().slice(0, 180);
  if (!trace) return;

  sessionStorage.setItem(TRACE_KEY, trace);
  if (activityTitle) sessionStorage.setItem(TITLE_KEY, activityTitle);

  const originalFetch = window.fetch.bind(window);
  const workerHost = 'tdeawork.fangwl591021.workers.dev';

  function tracedUrl(raw) {
    let url;
    try { url = new URL(raw, location.href); } catch { return raw; }
    const eligibleHost = url.hostname === location.hostname || url.hostname === workerHost;
    if (!eligibleHost || !url.pathname.startsWith('/api/')) return raw;
    if (!url.searchParams.has('tdeaTrace')) url.searchParams.set('tdeaTrace', trace);
    if (activityTitle && !url.searchParams.has('tdeaActivityTitle')) url.searchParams.set('tdeaActivityTitle', activityTitle);
    url.searchParams.set('tdeaSource', 'tdea-design');
    return url.toString();
  }

  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(tracedUrl(String(input)), init);
      }
      if (input instanceof Request) {
        const nextUrl = tracedUrl(input.url);
        if (nextUrl !== input.url) return originalFetch(new Request(nextUrl, input), init);
      }
    } catch {}
    return originalFetch(input, init);
  };
})();
