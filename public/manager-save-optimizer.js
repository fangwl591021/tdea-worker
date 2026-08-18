(() => {
  if (window.__tdeaManagerSaveOptimizerInstalled) return;
  window.__tdeaManagerSaveOptimizerInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  let baseline = null;
  let saveChain = Promise.resolve();
  const stats = { requested: 0, sent: 0, skipped: 0, fullBytes: 0, sentBytes: 0, rosterRebases: 0 };

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

  function payloadSource(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  }

  function rememberBaseline(payload) {
    const source = payloadSource(payload);
    if (!source) return;
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

  function clean(value) {
    return String(value ?? "").trim();
  }

  function memberKey(row, index = 0) {
    if (!row || typeof row !== "object") return `__row_${index}`;
    const id = clean(row.id);
    if (id) return `id:${id}`;
    const no = clean(row.memberNo || row.rosterMemberNo || row.member_no).toUpperCase();
    if (no) return `no:${no}`;
    const name = clean(row.name || row.companyName || row.rosterName || row.displayName).toLowerCase();
    return name ? `name:${name}` : `__row_${index}`;
  }

  function rosterMap(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row, index) => map.set(memberKey(row, index), row));
    return map;
  }

  function mergeRosterSafely(intendedRows, baselineRows, freshRows) {
    const intended = Array.isArray(intendedRows) ? intendedRows : [];
    const before = Array.isArray(baselineRows) ? baselineRows : [];
    const fresh = Array.isArray(freshRows) ? freshRows : [];
    const intendedMap = rosterMap(intended);
    const baselineMap = rosterMap(before);
    const freshMap = rosterMap(fresh);

    // 只有「這個分頁原本看得到、現在明確拿掉」的會員才視為刪除。
    // 其他分頁在本分頁載入之後新增的會員，不得被舊快照刪掉。
    const deletedKeys = new Set();
    baselineMap.forEach((_, key) => {
      if (!intendedMap.has(key)) deletedKeys.add(key);
    });

    const merged = [];
    const used = new Set();

    intended.forEach((row, index) => {
      const key = memberKey(row, index);
      merged.push(row);
      used.add(key);
    });

    fresh.forEach((row, index) => {
      const key = memberKey(row, index);
      if (used.has(key) || deletedKeys.has(key)) return;
      merged.push(row);
      used.add(key);
    });

    return merged;
  }

  async function readFreshManager(input, init = {}) {
    const headers = new Headers(init?.headers || {});
    const response = await nativeFetch(input, {
      method: "GET",
      headers,
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payloadSource(payload);
  }

  async function rebaseRosterFields(input, init, delta) {
    const rosterKeys = ["association", "vendor"].filter((key) => Array.isArray(delta[key]));
    if (!rosterKeys.length) return delta;

    const fresh = await readFreshManager(input, init).catch(() => null);
    if (!fresh) return delta;

    const next = { ...delta };
    rosterKeys.forEach((key) => {
      next[key] = mergeRosterSafely(
        delta[key],
        Array.isArray(baseline?.[key]) ? baseline[key] : [],
        Array.isArray(fresh[key]) ? fresh[key] : []
      );
    });
    stats.rosterRebases += 1;
    return next;
  }

  async function optimizedPut(input, init, payload) {
    const fullText = JSON.stringify(payload);
    stats.requested += 1;
    stats.fullBytes += fullText.length;

    let delta = deltaPayload(payload);
    const keys = Object.keys(delta);
    if (!keys.length) {
      stats.skipped += 1;
      return responseJson({ success: true, optimized: true, skipped: true });
    }

    delta = await rebaseRosterFields(input, init, delta);
    const body = JSON.stringify(delta);
    stats.sent += 1;
    stats.sentBytes += body.length;

    const response = await nativeFetch(input, { ...init, body });
    if (response.ok) {
      const fresh = await readFreshManager(input, init).catch(() => null);
      if (fresh) rememberBaseline(fresh);
      else {
        if (!baseline) baseline = {};
        baseline = { ...baseline, ...payload };
      }
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
