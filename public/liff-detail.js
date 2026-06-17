(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const params = mergedParams();
  const closeMode = params.get("close") === "1" || params.get("submitted") === "1";
  const detailId = params.get("monthlyDetail") || params.get("monthlyDetailId") || params.get("activityNo") || params.get("id");
  if (!detailId && !closeMode) return;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const trim = (value) => String(value ?? "").trim();

  function meaningfulText(value) {
    const text = trim(value);
    return text.replace(/[,\s/\\|._\-，、。；;:：]+/g, "").length ? text : "";
  }

  function pageImages(page) {
    const seen = new Set();
    return [page?.imageUrl, ...(Array.isArray(page?.galleryUrls) ? page.galleryUrls : String(page?.galleryUrls || "").split(/[\n,]+/))]
      .map((value) => trim(value))
      .filter((value) => /^https?:\/\//i.test(value))
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  }

  function marqueeItems(config) {
    if (!config || config.enabled === false) return [];
    const rawItems = Array.isArray(config.imageItems) ? config.imageItems : [];
    if (rawItems.length) {
      return rawItems
        .map((item, index) => ({
          id: trim(item.id) || `marquee-${index + 1}`,
          imageUrl: trim(item.imageUrl),
          linkUrl: trim(item.linkUrl),
          title: trim(item.title),
          enabled: item.enabled !== false
        }))
        .filter((item) => item.enabled && /^https?:\/\//i.test(item.imageUrl));
    }
    return [...new Set([...(Array.isArray(config.imageUrls) ? config.imageUrls : []), config.imageUrl].map((url) => trim(url)).filter(Boolean))]
      .filter((url) => /^https?:\/\//i.test(url))
      .map((url, index) => ({ id: `marquee-${index + 1}`, imageUrl: url, linkUrl: "", title: "", enabled: true }));
  }

  async function loadMarquee() {
    try {
      const res = await fetch(`${api}/api/marquee`, { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) return null;
      return result.data || null;
    } catch (_) {
      return null;
    }
  }

  function registerIdFromUrl(value) {
    try {
      const parsed = new URL(value);
      const direct = parsed.searchParams.get("register");
      if (direct) return direct;
      const state = parsed.searchParams.get("liff.state");
      if (!state) return "";
      const stateParams = new URLSearchParams(decodeURIComponent(state).replace(/^\?/, ""));
      return stateParams.get("register") || "";
    } catch (_) {
      return "";
    }
  }

  async function fallbackDetailFromForm(page) {
    const formId = registerIdFromUrl(page?.formUrl || "");
    if (!formId) return "";
    try {
      const res = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache: "no-store" });
      const result = await res.json();
      return meaningfulText(result.data?.activity?.detailText);
    } catch (_) {
      return "";
    }
  }

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
      .liff-gallery{margin:0 0 18px}
      .liff-gallery-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;color:#111827}
      .liff-gallery-head strong{font-size:16px}
      .liff-gallery-head span{font-size:12px;color:#667085;font-weight:800}
      .liff-slider{position:relative;margin:-4px 0 16px;overflow:hidden;border-radius:12px;background:#eef2f7;min-height:320px}
      .liff-slider-track{display:flex;transition:transform .42s ease}
      .liff-slide{flex:0 0 100%;min-width:100%;min-height:320px;aspect-ratio:4/5;background:#eef2f7}
      .liff-slide img{width:100%;height:100%;object-fit:cover;border-radius:0;margin:0}
      .liff-slide-link{display:block;width:100%;height:100%}
      .liff-slider-nav{position:absolute;left:0;right:0;top:50%;display:flex;justify-content:space-between;transform:translateY(-50%);pointer-events:none}
      .liff-slider-nav button{pointer-events:auto;border:0;border-radius:999px;background:rgba(17,24,39,.72);color:#fff;width:34px;height:34px;margin:0 10px;font-size:22px}
      .liff-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:6px}
      .liff-dots button{width:7px;height:7px;border:0;border-radius:999px;background:rgba(255,255,255,.62);padding:0}
      .liff-dots button.active{background:#06c755;width:18px}
      .liff-marquee{margin:18px 0;padding:14px;border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc}
      .liff-marquee-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
      .liff-marquee-head strong{font-size:16px;color:#111827}
      .liff-marquee-head span{font-size:12px;color:#667085;font-weight:800}
      .liff-marquee .liff-slider{margin:0;border-radius:10px}
      .liff-marquee .liff-slide{aspect-ratio:1/1}
      .liff-card h1{font-size:24px;line-height:1.35;margin:0 0 12px}
      .liff-meta{display:inline-flex;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:#eafff1;color:#027a48;font-size:13px;font-weight:800}
      .liff-text{white-space:pre-wrap;line-height:1.7;color:#344054;font-size:16px}
      .liff-btn{display:block;margin-top:18px;padding:13px 16px;border-radius:10px;background:#06c755;color:#fff;text-align:center;text-decoration:none;font-weight:800}
      .liff-empty{padding:28px;text-align:center;color:#667085}
      .liff-done{padding:34px 24px;text-align:center}
      .liff-done h1{margin:0 0 10px;font-size:24px}
      .liff-done p{margin:0;color:#667085;line-height:1.7}
      @media(max-width:480px){.liff-slider,.liff-slide{min-height:280px}}
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

  function slider(images) {
    if (!images.length) return "";
    if (images.length === 1) return `<img src="${esc(images[0])}" alt="">`;
    return `<div class="liff-slider" data-liff-slider><div class="liff-slider-track">${images.map((url) => `<div class="liff-slide"><img src="${esc(url)}" alt=""></div>`).join("")}</div><div class="liff-slider-nav"><button type="button" data-liff-prev aria-label="\u4e0a\u4e00\u5f35">&lsaquo;</button><button type="button" data-liff-next aria-label="\u4e0b\u4e00\u5f35">&rsaquo;</button></div><div class="liff-dots">${images.map((_, index) => `<button type="button" data-liff-dot="${index}" class="${index === 0 ? "active" : ""}" aria-label="\u7b2c ${index + 1} \u5f35"></button>`).join("")}</div></div>`;
  }

  function marqueeHtml(config) {
    const items = marqueeItems(config);
    if (!items.length) return "";
    const slides = items.map((item) => {
      const image = `<img src="${esc(item.imageUrl)}" alt="${esc(item.title || "")}">`;
      return `<div class="liff-slide">${item.linkUrl ? `<a class="liff-slide-link" href="${esc(item.linkUrl)}">${image}</a>` : image}</div>`;
    }).join("");
    const body = items.length === 1
      ? `<div class="liff-slider"><div class="liff-slider-track">${slides}</div></div>`
      : `<div class="liff-slider" data-liff-slider><div class="liff-slider-track">${slides}</div><div class="liff-slider-nav"><button type="button" data-liff-prev aria-label="上一張">‹</button><button type="button" data-liff-next aria-label="下一張">›</button></div><div class="liff-dots">${items.map((_, index) => `<button type="button" data-liff-dot="${index}" class="${index === 0 ? "active" : ""}" aria-label="第 ${index + 1} 張"></button>`).join("")}</div></div>`;
    return `<section class="liff-marquee"><div class="liff-marquee-head"><strong>${esc(config?.title || "TDEA 廣告贈點")}</strong><span>${items.length} 張</span></div>${body}</section>`;
  }

  function bindSlider() {
    document.querySelectorAll("[data-liff-slider]").forEach((root) => {
      const track = root.querySelector(".liff-slider-track");
      const dots = Array.from(root.querySelectorAll("[data-liff-dot]"));
      const total = dots.length;
      if (!track || !total) return;
      let index = 0;
      let timer = null;
      const go = (next) => {
        index = (next + total) % total;
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
      };
      const restart = () => {
        if (timer) clearInterval(timer);
        timer = setInterval(() => go(index + 1), 3000);
      };
      root.querySelector("[data-liff-prev]")?.addEventListener("click", () => { go(index - 1); restart(); });
      root.querySelector("[data-liff-next]")?.addEventListener("click", () => { go(index + 1); restart(); });
      dots.forEach((dot) => dot.addEventListener("click", () => { go(Number(dot.dataset.liffDot || 0)); restart(); }));
      restart();
    });
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
      const result = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" }).then((res) => res.json());
      const pages = Array.isArray(result.data?.pages) ? result.data.pages : [];
      const page = pages.find(matchPage);
      if (!page) {
        shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">找不到這筆活動說明。</div></section></main>`);
        return;
      }
      const detailText = meaningfulText(page.detailText) || await fallbackDetailFromForm(page);
      const images = pageImages(page);
      document.title = page.detailTitle || "\u8a73\u7d30\u8aaa\u660e";
      shell(`<main class="liff-detail"><section class="liff-card">${images.length ? `<section class="liff-gallery"><div class="liff-gallery-head"><strong>\u6d3b\u52d5\u5716\u96c6</strong><span>${images.length} \u5f35</span></div>${slider(images)}</section>` : ""}${page.activityNo ? `<div class="liff-meta">${esc(page.activityNo)}</div>` : ""}<h1>${esc(page.detailTitle || "\u8a73\u7d30\u8aaa\u660e")}</h1><div class="liff-text">${esc(detailText || "\u5c1a\u672a\u586b\u5beb\u8a73\u7d30\u8aaa\u660e\u3002")}</div>${page.formUrl ? `<a class="liff-btn" href="${esc(page.formUrl)}">\u524d\u5f80\u5831\u540d</a>` : ""}</section></main>`);
      bindSlider();
    } catch (_) {
      shell(`<main class="liff-detail"><section class="liff-card"><div class="liff-empty">詳細說明載入失敗，請稍後再試。</div></section></main>`);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
