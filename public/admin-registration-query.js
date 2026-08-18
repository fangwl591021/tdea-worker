(() => {
  const params = new URLSearchParams(location.search);
  const publicKeys = ["cardCollection","register","query","memberQr","calendar","checkin","redeem","redeemSession","monthlyDetail","personalMessages","close","marquee","motherRegister","memberHome"];
  if (publicKeys.some((key) => params.has(key))) return;

  function closeDialog() {
    document.querySelector("[data-admin-registration-query-dialog]")?.remove();
  }

  function openDialog() {
    closeDialog();
    const activityPanel = [...document.querySelectorAll("section.panel")]
      .find((panel) => panel.querySelector(".panel-title")?.textContent?.trim() === "活動清單");
    const rows = activityPanel ? [...activityPanel.querySelectorAll("tbody tr")] : [];

    const dialog = document.createElement("div");
    dialog.dataset.adminRegistrationQueryDialog = "1";
    dialog.innerHTML = `
      <div style="position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.48)" data-registration-query-close></div>
      <section style="position:fixed;z-index:9999;inset:6vh 6vw;overflow:auto;background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.24)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">
          <div><h2 style="margin:0">報名查詢</h2><div style="margin-top:5px;color:#667085">選擇活動查看原有報名名單</div></div>
          <button class="btn" type="button" data-registration-query-close>關閉</button>
        </div>
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>課程時間</th><th>報名人數</th><th>操作</th></tr></thead><tbody>${rows.map((row) => {
          const cells = row.querySelectorAll("td");
          const source = row.querySelector("[data-registration-list]");
          const id = source?.dataset.registrationList || "";
          return `<tr><td><strong>${cells[0]?.textContent?.trim() || "活動"}</strong></td><td>${cells[2]?.textContent?.trim() || "-"}</td><td>${cells[3]?.textContent?.trim() || "0"}</td><td><button class="btn primary" type="button" data-admin-open-registration="${id}">查看報名</button></td></tr>`;
        }).join("")}</tbody></table></div>` : `<div class="empty">目前沒有活動可查詢</div>`}
      </section>`;

    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-registration-query-close]").forEach((button) => button.addEventListener("click", closeDialog));
    dialog.querySelectorAll("[data-admin-open-registration]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.adminOpenRegistration || "";
      closeDialog();
      document.querySelector(`[data-registration-list="${CSS.escape(id)}"]`)?.click();
    }));
  }

  function launch() {
    const dashboard = document.querySelector('[data-nav="dashboard"]');
    if (dashboard && !dashboard.classList.contains("active")) dashboard.click();
    setTimeout(openDialog, 50);
  }

  function install() {
    const nav = document.querySelector(".sidebar .nav");
    if (!nav || nav.querySelector("[data-admin-registration-query]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.adminRegistrationQuery = "1";
    button.textContent = "報名查詢";
    button.title = "報名查詢";
    button.addEventListener("click", launch);
    const dashboard = nav.querySelector('[data-nav="dashboard"]');
    if (dashboard) dashboard.insertAdjacentElement("afterend", button);
    else nav.prepend(button);
  }

  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
