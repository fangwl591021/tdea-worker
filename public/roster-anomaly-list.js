(() => {
  if (new URLSearchParams(location.search).toString()) {
    const params = new URLSearchParams(location.search);
    const publicKeys = ["cardCollection","register","query","memberQr","calendar","checkin","redeem","redeemSession","monthlyDetail","personalMessages","close","marquee","motherRegister","memberHome"];
    if (publicKeys.some((key) => params.has(key))) return;
  }

  const clean = (value) => String(value ?? "").trim();
  const norm = (value) => clean(value).toLocaleLowerCase().replace(/\s+/g, "");
  const phone = (row) => clean(row?.phone || row?.mobile || row?.tel || row?.telephone || row?.contactPhone).replace(/[^0-9+]/g, "").replace(/^\+8860?/, "0");
  const memberNo = (row) => clean(row?.memberNo || row?.rosterMemberNo || row?.member_no || row?.memberNumber).toUpperCase();
  const memberName = (row) => clean(row?.name || row?.rosterName || row?.memberName || row?.displayName || row?.fullName);
  const lineUid = (row) => clean(row?.lineUserId || row?.LINE_user_id || row?.uid || row?.lineUid || row?.line_user_id);
  const tdeaId = (row) => clean(row?.tdeaDesignUserId || row?.tdea_design_user_id);
  const completed = (row) => Boolean(clean(
    row?.profileCompletedAt || row?.profile_completed_at || row?.rosterVerifiedAt || row?.roster_verified_at ||
    row?.registrationCompletedAt || row?.registration_completed_at || row?.completedAt || row?.completed_at
  ));

  const stored = (...keys) => {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (clean(value)) return clean(value);
    }
    return "";
  };
  const adminHeaders = () => ({
    accept: "application/json",
    ...(stored("tdea-admin-email") ? { "x-admin-email": stored("tdea-admin-email").toLowerCase() } : {}),
    ...(stored("tdea-admin-member-no", "tdea-member-no") ? { "x-admin-member-no": stored("tdea-admin-member-no", "tdea-member-no").toUpperCase() } : {}),
    ...(stored("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId") ? { "x-line-user-id": stored("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId") } : {})
  });

  async function loadAssociationRows() {
    const response = await fetch("/api/manager-data", { headers: adminHeaders(), cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) throw new Error(payload?.message || "讀取協會名冊失敗");
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    return Array.isArray(data?.association) ? data.association.filter((row) => row && typeof row === "object") : [];
  }

  function anomalyGroups(rows) {
    const valid = rows.filter((row) => memberNo(row) && memberName(row));
    const parent = valid.map((_, index) => index);
    const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
    const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
    const linkBy = (keyFn) => {
      const seen = new Map();
      valid.forEach((row, index) => {
        const key = keyFn(row);
        if (!key) return;
        if (seen.has(key)) join(index, seen.get(key));
        else seen.set(key, index);
      });
    };

    linkBy((row) => norm(memberName(row)));
    linkBy((row) => {
      const n = norm(memberName(row)), p = phone(row);
      return n && p ? `${n}|${p}` : "";
    });
    linkBy((row) => /^U[0-9a-f]{32}$/i.test(lineUid(row)) ? lineUid(row).toLowerCase() : "");
    linkBy((row) => tdeaId(row));

    const buckets = new Map();
    valid.forEach((row, index) => {
      const root = find(index);
      if (!buckets.has(root)) buckets.set(root, []);
      buckets.get(root).push(row);
    });

    return [...buckets.values()].filter((group) => {
      const numbers = new Set(group.map(memberNo).filter(Boolean));
      return group.length > 1 && numbers.size > 1;
    }).map((group) => {
      const reasons = [];
      const duplicateKey = (keyFn) => {
        const counts = new Map();
        group.forEach((row) => { const key = keyFn(row); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
        return [...counts.values()].some((count) => count > 1);
      };
      if (duplicateKey((row) => /^U[0-9a-f]{32}$/i.test(lineUid(row)) ? lineUid(row).toLowerCase() : "")) reasons.push("LINE UID 相同");
      if (duplicateKey((row) => tdeaId(row))) reasons.push("TDEA 身分 ID 相同");
      if (duplicateKey((row) => { const n = norm(memberName(row)), p = phone(row); return n && p ? `${n}|${p}` : ""; })) reasons.push("姓名＋行動電話相同");
      if (duplicateKey((row) => norm(memberName(row)))) reasons.push("同名不同會員編號");
      const score = reasons.some((r) => r.includes("LINE UID") || r.includes("TDEA 身分")) ? 3 : reasons.some((r) => r.includes("姓名＋行動電話")) ? 2 : 1;
      return { rows: group.slice().sort((a, b) => Number(completed(b)) - Number(completed(a))), reasons, score };
    }).sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);
  }

  const esc = (value) => clean(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
  const shortUid = (value) => { const v = clean(value); return v.length > 16 ? `${v.slice(0, 8)}…${v.slice(-6)}` : v; };

  function openModal(groups) {
    document.querySelector("[data-roster-anomaly-modal]")?.remove();
    const modal = document.createElement("div");
    modal.dataset.rosterAnomalyModal = "1";
    modal.innerHTML = `<div style="position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.5);backdrop-filter:blur(3px)"></div>
      <section style="position:fixed;z-index:9999;inset:4vh 4vw;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.25)">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;position:sticky;top:-24px;background:#fff;padding:24px 0 14px;z-index:2">
          <div><h2 style="margin:0 0 6px">⚠ 協會會員異常名單</h2><p style="margin:0;color:#667085">唯讀檢查，共 ${groups.length} 組。此畫面不刪除、不合併、不修改會員資料。</p></div>
          <button type="button" data-anomaly-close style="border:1px solid #d0d5dd;background:#fff;border-radius:10px;padding:9px 14px;cursor:pointer">關閉</button>
        </div>
        <div style="display:grid;gap:16px">${groups.length ? groups.map((group) => `
          <article style="border:1px solid ${group.score >= 2 ? "#f79009" : "#e4e7ec"};border-radius:14px;overflow:hidden">
            <div style="padding:12px 16px;background:${group.score >= 2 ? "#fffaeb" : "#f9fafb"};font-weight:800">${esc(group.reasons.join("／"))}</div>
            <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;min-width:760px"><thead><tr style="background:#f9fafb"><th style="padding:10px;text-align:left">會員編號</th><th style="padding:10px;text-align:left">姓名</th><th style="padding:10px;text-align:left">行動電話</th><th style="padding:10px;text-align:left">LINE UID</th><th style="padding:10px;text-align:left">註冊狀態</th></tr></thead><tbody>${group.rows.map((row) => `
              <tr style="border-top:1px solid #eaecf0"><td style="padding:10px">${esc(memberNo(row))}</td><td style="padding:10px;font-weight:700">${esc(memberName(row))}</td><td style="padding:10px">${esc(phone(row) || "—")}</td><td style="padding:10px">${esc(shortUid(lineUid(row)) || "—")}</td><td style="padding:10px"><span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${completed(row) ? "#ecfdf3" : "#fff4ed"};color:${completed(row) ? "#027a48" : "#b54708"};font-weight:700">${completed(row) ? "有完成標記" : "疑似未完成"}</span></td></tr>`).join("")}</tbody></table></div>
          </article>`).join("") : `<div style="padding:36px;text-align:center;border:1px dashed #d0d5dd;border-radius:14px;color:#667085">目前未偵測到同名／重複身分異常群組。</div>`}</div>
      </section>`;
    const close = () => modal.remove();
    modal.querySelector("[data-anomaly-close]")?.addEventListener("click", close);
    modal.firstElementChild?.addEventListener("click", close);
    document.body.appendChild(modal);
  }

  let cachedGroups = null;
  let loading = false;
  async function refreshButton(button, force = false) {
    if (loading) return;
    if (cachedGroups && !force) {
      button.textContent = `⚠ 異常名單 ${cachedGroups.length}`;
      return;
    }
    loading = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "檢查中…";
    try {
      cachedGroups = anomalyGroups(await loadAssociationRows());
      button.textContent = `⚠ 異常名單 ${cachedGroups.length}`;
    } catch (error) {
      button.textContent = original || "⚠ 異常名單";
      console.error("Roster anomaly scan failed", error);
    } finally {
      button.disabled = false;
      loading = false;
    }
  }

  function install() {
    const panels = [...document.querySelectorAll("section.panel")];
    const panel = panels.find((item) => item.querySelector(".panel-title")?.textContent?.trim() === "協會會員");
    if (!panel || panel.querySelector("[data-roster-anomaly-button]")) return;
    const actions = panel.querySelector(".panel-head .actions");
    const exportButton = actions?.querySelector("[data-export]");
    if (!actions || !exportButton) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.dataset.rosterAnomalyButton = "1";
    button.textContent = "⚠ 異常名單";
    button.style.borderColor = "#f79009";
    button.style.color = "#b54708";
    actions.insertBefore(button, exportButton);
    button.addEventListener("click", async () => {
      await refreshButton(button, true);
      if (cachedGroups) openModal(cachedGroups);
    });
    refreshButton(button).catch(() => {});
  }

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
