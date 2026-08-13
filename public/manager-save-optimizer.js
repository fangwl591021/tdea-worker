(() => {
  if (window.__tdeaManagerSaveOptimizerInstalled) return;
  window.__tdeaManagerSaveOptimizerInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  let baseline = null;
  let saveChain = Promise.resolve();
  const stats = { requested: 0, sent: 0, skipped: 0, fullBytes: 0, sentBytes: 0 };

  function isManagerDataUrl(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, location.href);
      return url.pathname === "/api/manager-data";
    } catch (_) {
      return false;
    }
  }

  function same(a, b) {
    if (a === b) return true;
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch (_) { return false; }
  }

  function responseJson(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  function rememberBaseline(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
    const source = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : payload;
    if (!source || typeof source !== "object" || Array.isArray(source)) return;
    const copy = { ...source };
    delete copy.success;
    delete copy.message;
    baseline = copy;
  }

  function deltaPayload(payload) {
    if (!baseline || typeof baseline !== "object") return payload;
    const delta = {};
    Object.keys(payload).forEach((key) => {
      if (key === "updatedAt") return;
      if (!same(payload[key], baseline[key])) delta[key] = payload[key];
    });
    return delta;
  }

  async function optimizedPut(input, init, payload) {
    const fullText = JSON.stringify(payload);
    stats.requested += 1;
    stats.fullBytes += fullText.length;

    const delta = deltaPayload(payload);
    const keys = Object.keys(delta);
    if (!keys.length) {
      stats.skipped += 1;
      return responseJson({ success: true, optimized: true, skipped: true });
    }

    const body = JSON.stringify(delta);
    stats.sent += 1;
    stats.sentBytes += body.length;

    const response = await nativeFetch(input, { ...init, body });
    if (response.ok) {
      if (!baseline) baseline = {};
      baseline = { ...baseline, ...payload };
    }
    return response;
  }

  window.fetch = function tdeaOptimizedFetch(input, init = {}) {
    if (!isManagerDataUrl(input)) return nativeFetch(input, init);

    const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
    if (method === "GET") {
      return nativeFetch(input, init).then((response) => {
        if (response.ok) response.clone().json().then(rememberBaseline).catch(() => {});
        return response;
      });
    }

    if (method !== "PUT" || typeof init?.body !== "string") return nativeFetch(input, init);

    let payload;
    try { payload = JSON.parse(init.body); }
    catch (_) { return nativeFetch(input, init); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return nativeFetch(input, init);

    const task = saveChain.then(() => optimizedPut(input, init, payload));
    saveChain = task.then(() => undefined, () => undefined);
    return task;
  };

  window.__tdeaManagerSaveOptimizer = {
    stats,
    getBaseline: () => baseline ? { ...baseline } : null
  };
})();
