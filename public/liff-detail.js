(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const params = new URLSearchParams(location.search);
  const detailId = params.get("monthlyDetail") || params.get("monthlyDetailId") || params.get("id");
  if (!detailId) return;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

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
      .liff-text{white-space:pre-wrap;line-height:1.7;color:#344054;font-size:16px}
      .liff-btn{display:block;margin-top:18px;padding:13px 16px;border-radius:10px;background:#06c755;color:#fff;text-align:center;text-decoration:none;font-weight:800}
      .liff-empty{padding:28px;text-align:center;color:#667085}
    `;
    document.head.appendChild(el);
  }

  async function load() {
    style();
    shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">載入詳細說明中...</div></section></main>`);
    try {
      const res = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" });
      const result = await res.json();
      const pages = Array.isArray(result.data?.pages) ? result.data.pages : [];
      const page = pages.find((item) => String(item.id) === String(detailId));
      if (!page) {
        shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">找不到這筆活動說明。</div></section></main>`);
        return;
      }
      document.title = page.detailTitle || "詳細說明";
      shell(`<main class="liff-detail"><section class="liff-card">${page.imageUrl ? `<img src="${esc(page.imageUrl)}" alt="">` : ""}<h1>${esc(page.detailTitle || "詳細說明")}</h1><div class="liff-text">${esc(page.detailText || "尚未填寫詳細說明。")}</div>${page.formUrl ? `<a class="liff-btn" href="${esc(page.formUrl)}">點我報名</a>` : ""}</section></main>`);
    } catch (_) {
      shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">詳細說明載入失敗，請稍後再試。</div></section></main>`);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
