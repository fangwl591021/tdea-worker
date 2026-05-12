(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const params = mergedParams();
  const closeMode = params.get("close") === "1" || params.get("submitted") === "1";
  const detailId = params.get("monthlyDetail") || params.get("monthlyDetailId") || params.get("activityNo") || params.get("id");
  if (!detailId && !closeMode) return;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const state = output.get("liff.state");
    if (!state) return output;
    let raw = state;
    try { raw = decodeURIComponent(state); } catch (_) {}
    const query = raw.startsWith("?") ? raw.slice(1) : raw.includes("?") ? raw.split("?").slice(1).join("?") : raw;
    const stateParams = new URLSearchParams(query);
    stateParams.forEach((value, key) => {
      if (!output.has(key)) output.set(key, value);
    });
    return output;
  }

  function shell(content) {
    document.body.classList.add("liff-detail-mode");
    document.querySelector("#app").innerHTML = content;
  }

  function style() {
    if (document.querySelector("#liff-detail-style")) return;
    const el = document.createElement("style");
    el.id = "liff-detail-style";
    el.textContent = `
      body.liff-detail-mode{margin:0;background:#f4f6f8;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}
      .liff-detail{max-width:760px;margin:0 auto;padding:20px}
      .liff-card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 14px 36px rgba(15,23,42,.08)}
      .liff-card img{width:100%;border-radius:10px;margin-bottom:16px;display:block}
      .liff-card h1{font-size:24px;line-height:1.35;margin:0 0 12px}
      .liff-meta{display:inline-flex;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:#eafff1;color:#027a48;font-size:13px;font-weight:800}
      .liff-text{white-space:pre-wrap;line-height:1.7;color:#344054;font-size:16px}
      .liff-btn{display:block;margin-top:18px;padding:13px 16px;border-radius:10px;background:#06c755;color:#fff;text-align:center;text-decoration:none;font-weight:800}
      .liff-empty{padding:28px;text-align:center;color:#667085}
      .liff-done{padding:34px 24px;text-align:center}
      .liff-done h1{margin:0 0 10px;font-size:24px}
      .liff-done p{margin:0;color:#667085;line-height:1.7}
    `;
    document.head.appendChild(el);
  }

  function closeWindowSoon() {
    const fallback = () => setTimeout(() => { try { window.close(); } catch (_) {} }, 500);
    const done = () => {
      try {
        if (window.liff?.isInClient?.()) {
          setTimeout(() => window.liff.closeWindow(), 700);
        } else {
          fallback();
        }
      } catch (_) {
        fallback();
      }
    };
    if (window.liff) {
      window.liff.init({ liffId: "2005868456-2jmxqyFU" }).then(done).catch(fallback);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.onload = () => window.liff?.init({ liffId: "2005868456-2jmxqyFU" }).then(done).catch(fallback);
    script.onerror = fallback;
    document.head.appendChild(script);
  }

  function matchPage(page) {
    return String(page.id || "") === String(detailId) || String(page.activityNo || "") === String(detailId);
  }

  async function load() {
    style();
    if (closeMode) {
      shell(`<main class="liff-detail"><section class="liff-card liff-done"><h1>報名完成</h1><p>感謝您的報名，畫面將自動關閉。</p></section></main>`);
      closeWindowSoon();
      return;
    }
    shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">載入詳細說明中...</div></section></main>`);
    try {
      const res = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" });
      const result = await res.json();
      const pages = Array.isArray(result.data?.pages) ? result.data.pages : [];
      const page = pages.find(matchPage);
      if (!page) {
        shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">找不到這筆活動說明。</div></section></main>`);
        return;
      }
      document.title = page.detailTitle || "詳細說明";
      shell(`<main class="liff-detail"><section class="liff-card">${page.imageUrl ? `<img src="${esc(page.imageUrl)}" alt="">` : ""}${page.activityNo ? `<div class="liff-meta">${esc(page.activityNo)}</div>` : ""}<h1>${esc(page.detailTitle || "詳細說明")}</h1><div class="liff-text">${esc(page.detailText || "尚未填寫詳細說明。")}</div>${page.formUrl ? `<a class="liff-btn" href="${esc(page.formUrl)}">點我報名</a>` : ""}</section></main>`);
    } catch (_) {
      shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">詳細說明載入失敗，請稍後再試。</div></section></main>`);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
