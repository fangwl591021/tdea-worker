(() => {
  const key = "tdea-manager-v3";

  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const n = (v) => Number(v || 0).toLocaleString("zh-TW");
  const load = () => {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  };
  const save = (data) => localStorage.setItem(key, JSON.stringify(data));
  const normalize = (data) => {
    data.activities ||= [];
    data.association ||= [];
    data.vendor ||= [];
    data.lottery ||= {};
    return data;
  };

  function candidates(data) {
    return data.association.map(x => ({ key: "association:" + (x.memberNo || x.id), memberNo: x.memberNo || "", name: x.name || "", source: "協會" }))
      .concat(data.vendor.map(x => ({ key: "vendor:" + (x.memberNo || x.id), memberNo: x.memberNo || "", name: x.companyName || "", source: "廠商" })))
      .filter(x => x.name || x.memberNo);
  }

  function history(data, activityId) {
    return data.lottery[activityId] || [];
  }

  function nextBatch(data, activityId) {
    return history(data, activityId).reduce((m, x) => Math.max(m, Number(x.batch || 0)), 0) + 1;
  }

  function shuffle(rows) {
    const copy = rows.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async function loadRosterIfNeeded(data) {
    if (data.association.length || data.vendor.length) return data;
    for (const url of ["roster.json", "public/roster.json"]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const seed = await res.json();
        data.association = (seed.a || []).map(x => ({ id: "association-" + x[0], memberNo: x[0] || "", identity: x[1] || "", name: x[2] || "", gender: x[3] || "", qualification: x[4] || "Y", note: x[5] || "" }));
        data.vendor = (seed.v || []).map(x => ({ id: "vendor-" + x[0], memberNo: x[0] || "", companyName: x[1] || "", taxId: x[2] || "", owner: x[3] || "", contact: x[4] || "", qualification: x[5] || "Y", note: x[6] || "" }));
        save(data);
        return data;
      } catch (_) {}
    }
    return data;
  }

  function toast(text) {
    const el = document.querySelector("#toast");
    if (!el) return alert(text);
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  function stat(label, value) {
    return `<div class="stat"><span>${label}</span><strong>${n(value)}</strong></div>`;
  }

  function table(rows) {
    if (!rows.length) return `<div class="empty">目前沒有中獎紀錄</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>編號</th><th>批次</th><th>會員編號</th><th>姓名 / 公司</th><th>來源</th><th>抽獎時間</th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.batch)}</td><td>${esc(x.memberNo)}</td><td><strong>${esc(x.name)}</strong></td><td>${esc(x.source)}</td><td>${esc(new Date(x.time).toLocaleString("zh-TW"))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  async function render(activityId = "") {
    const data = normalize(load());
    await loadRosterIfNeeded(data);
    const activities = data.activities;
    const main = document.querySelector(".main");
    if (!main) return;
    if (!activities.length) {
      main.innerHTML = `<div class="topbar"><div><h1>抽獎管理</h1><div class="subtitle">請先建立活動，再使用抽獎功能。</div></div></div><section class="panel"><div class="empty">目前沒有活動</div></section>`;
      return;
    }

    const activity = activities.find(x => x.id === activityId) || activities[0];
    const rows = history(data, activity.id);
    const pool = candidates(data);
    const won = new Set(rows.map(x => x.key));
    const available = pool.filter(x => !won.has(x.key));
    markActive();
    main.innerHTML = `
      <div class="topbar">
        <div><h1>抽獎管理</h1><div class="subtitle">依活動批次抽出中獎名單，已中獎者不會重複抽出。</div></div>
        <div class="actions"><button class="btn" data-lottery-export>匯出CSV</button><button class="btn danger" data-lottery-clear>清除紀錄</button></div>
      </div>
      <div class="grid stats">${stat("候選名冊", pool.length)}${stat("已中獎", rows.length)}${stat("可抽名額", available.length)}${stat("下一批次", nextBatch(data, activity.id))}</div>
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">活動抽獎</h2><span class="muted">${esc(activity.name)}</span></div>
        <div class="lottery-board">
          <div class="lottery-controls">
            <div class="field"><label>活動</label><select data-lottery-activity>${activities.map(x => `<option value="${esc(x.id)}" ${x.id === activity.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
            <div class="field"><label>抽獎人數</label><input type="number" min="1" max="${available.length}" value="1" data-lottery-count></div>
            <button class="btn primary" data-lottery-start>開始抽獎</button>
            <button class="btn" data-lottery-print>列印/PDF</button>
          </div>
          <div class="lottery-message">${pool.length ? `目前可抽 ${n(available.length)} 位。` : "尚未載入名冊。"}</div>
          ${table(rows)}
        </div>
      </section>`;
    bind(activity.id);
  }

  function bind(activityId) {
    document.querySelector("[data-lottery-activity]")?.addEventListener("change", e => render(e.target.value));
    document.querySelector("[data-lottery-print]")?.addEventListener("click", () => window.print());
    document.querySelector("[data-lottery-clear]")?.addEventListener("click", () => {
      if (!confirm("確定要清除這個活動的所有中獎紀錄？")) return;
      const data = normalize(load());
      data.lottery[activityId] = [];
      save(data);
      render(activityId);
      toast("中獎紀錄已清除");
    });
    document.querySelector("[data-lottery-export]")?.addEventListener("click", () => exportCsv(activityId));
    document.querySelector("[data-lottery-start]")?.addEventListener("click", () => start(activityId));
  }

  function start(activityId) {
    const data = normalize(load());
    const rows = history(data, activityId);
    const count = Math.max(1, Number(document.querySelector("[data-lottery-count]")?.value || 0));
    const won = new Set(rows.map(x => x.key));
    const pool = candidates(data).filter(x => !won.has(x.key));
    if (!pool.length) return toast("沒有可抽名單");
    const batch = nextBatch(data, activityId);
    const winners = shuffle(pool).slice(0, Math.min(count, pool.length)).map(x => ({ ...x, batch, time: new Date().toISOString() }));
    data.lottery[activityId] = rows.concat(winners);
    save(data);
    render(activityId);
    toast(`已抽出 ${winners.length} 位，第 ${batch} 批完成`);
  }

  function exportCsv(activityId) {
    const data = normalize(load());
    const rows = history(data, activityId);
    if (!rows.length) return toast("沒有中獎紀錄可匯出");
    const csv = [["編號", "批次", "會員編號", "姓名/公司", "來源", "抽獎時間"]]
      .concat(rows.map((x, i) => [i + 1, x.batch, x.memberNo, x.name, x.source, new Date(x.time).toLocaleString("zh-TW")]))
      .map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "lottery-winners.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function ensureEntrypoints() {
    const nav = document.querySelector(".nav");
    if (nav && !nav.querySelector("[data-lottery-nav]")) {
      const btn = document.createElement("button");
      btn.dataset.lotteryNav = "true";
      btn.textContent = "抽獎管理";
      btn.onclick = () => render();
      nav.insertBefore(btn, nav.querySelector("[data-nav='preview']") || null);
    }
    document.querySelectorAll("[data-drawer^='activity:']").forEach(btn => {
      const id = btn.dataset.drawer.split(":")[1];
      if (btn.parentElement?.querySelector(`[data-lottery-link="${CSS.escape(id)}"]`)) return;
      const sep = document.createElement("span");
      sep.className = "muted";
      sep.textContent = " / ";
      const link = document.createElement("button");
      link.className = "link";
      link.dataset.lotteryLink = id;
      link.textContent = "抽獎";
      link.onclick = () => render(id);
      btn.parentElement?.insertBefore(sep, btn.nextSibling);
      btn.parentElement?.insertBefore(link, sep.nextSibling);
    });
  }

  function markActive() {
    document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", Boolean(b.dataset.lotteryNav)));
  }

  const style = document.createElement("style");
  style.textContent = `.lottery-board{padding:18px}.lottery-controls{display:grid;grid-template-columns:minmax(220px,1fr) 140px auto auto;align-items:end;gap:12px;margin-bottom:14px}.lottery-message{margin-bottom:14px;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;background:#eff6ff;color:#1d4ed8;font-weight:700}@media(max-width:920px){.lottery-controls{grid-template-columns:1fr 1fr}}@media(max-width:560px){.lottery-controls{grid-template-columns:1fr}}@media print{.sidebar,.topbar .actions,.lottery-controls,.toast{display:none!important}.shell{display:block}.main{padding:0}.panel,.stat{box-shadow:none}}`;
  document.head.appendChild(style);

  new MutationObserver(ensureEntrypoints).observe(document.body, { childList: true, subtree: true });
  ensureEntrypoints();
})();
