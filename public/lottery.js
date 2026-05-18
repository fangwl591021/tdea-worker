(() => {
  const storeKey = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";

  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const n = (v) => Number(v || 0).toLocaleString("zh-TW");
  const uid = () => "lot-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  function load() {
    try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(storeKey, JSON.stringify(data));
  }

  function normalize(data) {
    data.activities ||= [];
    data.lottery ||= {};
    return data;
  }

  function lotteryState(data, activityId) {
    const raw = data.lottery?.[activityId];
    if (Array.isArray(raw)) {
      data.lottery[activityId] = { prizes: [], winners: raw };
    } else if (!raw || typeof raw !== "object") {
      data.lottery[activityId] = { prizes: [], winners: [] };
    }
    data.lottery[activityId].prizes ||= [];
    data.lottery[activityId].winners ||= [];
    return data.lottery[activityId];
  }

  function activityKeys(activity) {
    return [activity?.id, activity?.activityNo, activity?.formId, activity?.nativeFormId, activity?.googleFormId, activity?.opnformFormId, activity?.name]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  function valueText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("、");
    if (typeof value === "object") {
      if (value.value != null) return valueText(value.value);
      if (value.label != null) return valueText(value.label);
      if (value.text != null) return valueText(value.text);
      return Object.values(value).map(valueText).filter(Boolean).join("、");
    }
    return String(value).trim();
  }

  function answerValue(answers, names) {
    const entries = Object.entries(answers || {});
    for (const name of names) {
      const found = entries.find(([key]) => String(key).toLowerCase() === String(name).toLowerCase());
      if (found) return valueText(found[1]);
    }
    for (const name of names) {
      const found = entries.find(([key]) => String(key).toLowerCase().includes(String(name).toLowerCase()));
      if (found) return valueText(found[1]);
    }
    return "";
  }

  function candidateFromRegistration(row, index) {
    const answers = row?.answers || {};
    const name = answerValue(answers, ["姓名", "會員姓名", "name", "公司/單位", "公司", "company"]) || `報名者 ${index + 1}`;
    const memberNo = answerValue(answers, ["會員編號", "memberNo", "member_no"]);
    const phone = answerValue(answers, ["手機", "電話", "phone", "mobile"]);
    const email = answerValue(answers, ["Email", "email", "電子郵件"]);
    const lineUserId = valueText(row?.lineUserId || row?.LINE_user_id || row?.line_user_id || answers.LINE_user_id);
    const key = lineUserId || memberNo || email || phone || row?.id || row?.submittedAt || `${name}:${index}`;
    return {
      key: String(key),
      memberNo,
      name,
      phone,
      email,
      source: "報名名單",
      submittedAt: row?.submittedAt || "",
      answers
    };
  }

  function sampleRegistrations() {
    return Array.from({ length: 20 }, (_, index) => ({
      key: "test-" + (index + 1),
      memberNo: "TEST" + String(index + 1).padStart(3, "0"),
      name: "測試報名者 " + (index + 1),
      phone: "09" + String(10000000 + index).slice(0, 8),
      email: "",
      source: "測試名單",
      submittedAt: new Date().toISOString(),
      answers: {}
    }));
  }

  async function loadRegistrations(activity) {
    const keys = activityKeys(activity);
    if (!keys.length) return [];
    const response = await fetch(api + "/api/registrations/list?keys=" + keys.map(encodeURIComponent).join(","), { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(result.data)) throw new Error(result.message || "報名名單載入失敗");
    return result.data.map(candidateFromRegistration).filter((row) => row.key && row.name);
  }

  function shuffle(rows) {
    const copy = rows.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function toast(text) {
    const el = document.querySelector("#toast");
    if (!el) return alert(text);
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function stat(label, value) {
    return `<div class="stat"><span>${esc(label)}</span><strong>${n(value)}</strong></div>`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"' && quote && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === "," && !quote) { row.push(cell.trim()); cell = ""; continue; }
      if ((ch === "\n" || ch === "\r") && !quote) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
        continue;
      }
      cell += ch;
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function importPrizes(activityId, csvText) {
    const rows = parseCsv(csvText);
    if (!rows.length) return 0;
    const head = rows[0].map((x) => x.toLowerCase());
    const hasHead = head.some((x) => x.includes("品名") || x.includes("獎品") || x.includes("數量") || x.includes("quantity"));
    const dataRows = hasHead ? rows.slice(1) : rows;
    const idx = (names, fallback) => hasHead ? Math.max(head.findIndex((h) => names.some((name) => h.includes(name))), fallback) : fallback;
    const nameIndex = idx(["品名", "獎品", "name", "prize"], 0);
    const qtyIndex = idx(["數量", "quantity", "qty"], 1);
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    const nextSort = record.prizes.reduce((max, item) => Math.max(max, Number(item.sort || 0)), -1) + 1;
    const prizes = dataRows.map((row, offset) => ({
      id: uid(),
      name: row[nameIndex] || "",
      quantity: Math.max(1, Number(row[qtyIndex] || 1)),
      sort: nextSort + offset
    })).filter((item) => item.name);
    record.prizes = record.prizes.concat(prizes);
    save(data);
    return prizes.length;
  }

  function tableWinners(rows) {
    if (!rows.length) return `<div class="empty">目前沒有中獎紀錄</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>狀態</th><th>獎品</th><th>批次</th><th>會員編號</th><th>姓名 / 公司</th><th>手機</th><th>抽獎時間</th><th>操作</th></tr></thead><tbody>${rows.map((row) => `<tr class="${row.status === "absent" ? "muted-row" : ""}"><td><span class="badge ${row.status === "absent" ? "off" : "live"}">${row.status === "absent" ? "不在場" : "中獎"}</span></td><td>${esc(row.prizeName)}</td><td>${esc(row.batch)}</td><td>${esc(row.memberNo)}</td><td><strong>${esc(row.name)}</strong></td><td>${esc(row.phone)}</td><td>${esc(new Date(row.time).toLocaleString("zh-TW"))}</td><td>${row.status === "absent" ? `<span class="muted">已重抽</span><span class="muted"> / </span><button class="link danger-link" data-lottery-remove="${esc(row.id)}">清除紀錄</button>` : `<button class="link danger-link" data-lottery-redraw="${esc(row.id)}">不在場重抽</button><span class="muted"> / </span><button class="link danger-link" data-lottery-remove="${esc(row.id)}">清除中獎</button>`}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function tablePrizes(prizes) {
    if (!prizes.length) return `<div class="empty">尚未建立獎品表，請上傳 CSV 或手動新增獎品。</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>排序</th><th>品名</th><th>數量</th><th>已抽出</th><th>操作</th></tr></thead><tbody>${prizes.map((item) => `<tr><td><input class="compact-input" type="number" value="${esc(item.sort || 0)}" data-prize-sort="${esc(item.id)}"></td><td><input value="${esc(item.name)}" data-prize-name="${esc(item.id)}"></td><td><input class="compact-input" type="number" min="1" value="${esc(item.quantity || 1)}" data-prize-qty="${esc(item.id)}"></td><td>${esc(item.drawn || 0)}</td><td><button class="link danger-link" data-prize-delete="${esc(item.id)}">刪除</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  async function render(activityId = "") {
    const data = normalize(load());
    const activities = data.activities || [];
    const main = document.querySelector(".main");
    if (!main) return;
    if (!activities.length) {
      main.innerHTML = `<div class="topbar"><div><h1>抽獎管理</h1><div class="subtitle">請先建立活動，再使用抽獎功能。</div></div></div><section class="panel">${empty("目前沒有活動")}</section>`;
      return;
    }

    const activity = activities.find((item) => item.id === activityId) || activities[0];
    const record = lotteryState(data, activity.id);
    record.prizes.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    save(data);

    let registrations = [];
    let loadError = "";
    try {
      registrations = await loadRegistrations(activity);
    } catch (error) {
      loadError = error?.message || "報名名單載入失敗";
    }

    const activeWinners = record.winners.filter((row) => row.status !== "absent");
    const winnerKeys = new Set(activeWinners.map((row) => row.key));
    const absentKeys = new Set(record.winners.filter((row) => row.status === "absent").map((row) => row.key));
    const available = registrations.filter((row) => !winnerKeys.has(row.key) && !absentKeys.has(row.key));
    const prizesWithCount = record.prizes.map((prize) => ({
      ...prize,
      drawn: activeWinners.filter((row) => row.prizeId === prize.id).length
    }));
    const remainingPrizeSlots = prizesWithCount.reduce((sum, prize) => sum + Math.max(0, Number(prize.quantity || 1) - Number(prize.drawn || 0)), 0);

    markActive();
    main.innerHTML = `
      <div class="topbar">
        <div><h1>抽獎管理</h1><div class="subtitle">依當次活動報名名單抽獎，可上傳獎品表，並支援不在場重抽。</div></div>
        <div class="actions"><button class="btn" data-lottery-export>匯出中獎 CSV</button><button class="btn danger" data-lottery-clear>清除本活動抽獎</button></div>
      </div>
      <div class="grid stats">${stat("報名名單", registrations.length)}${stat("獎品總數", record.prizes.reduce((sum, item) => sum + Number(item.quantity || 0), 0))}${stat("已中獎", activeWinners.length)}${stat("可抽名額", Math.min(available.length, remainingPrizeSlots))}</div>
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">活動抽獎</h2><span class="muted">${esc(activity.name)}</span></div>
        <div class="lottery-board">
          <div class="lottery-controls">
            <div class="field"><label>活動</label><select data-lottery-activity>${activities.map((item) => `<option value="${esc(item.id)}" ${item.id === activity.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
            <div class="field"><label>抽獎品項</label><select data-lottery-prize>${prizesWithCount.map((prize) => `<option value="${esc(prize.id)}" ${Number(prize.drawn || 0) >= Number(prize.quantity || 1) ? "disabled" : ""}>${esc(prize.name)}（${n(prize.drawn)}/${n(prize.quantity)}）</option>`).join("")}</select></div>
            <button class="btn" data-lottery-test>測試抽獎</button>
            <button class="btn primary" data-lottery-start>抽出下一位</button>
            <button class="btn" data-lottery-print>列印/PDF</button>
          </div>
          <div class="lottery-message ${loadError ? "error" : ""}">${loadError ? esc(loadError) : `目前依「${esc(activity.name)}」報名名單抽獎，尚可抽 ${n(available.length)} 位。`}</div>
          <div class="lottery-test-result" data-lottery-test-result hidden></div>
          <div class="lottery-split">
            <section class="subpanel">
              <div class="subpanel-head"><h3>獎品表</h3><div class="actions"><button class="btn" data-prize-template>下載 Excel 範本</button><button class="btn" data-prize-add>新增獎品</button><button class="btn" data-prize-save>儲存獎品表</button></div></div>
              <div class="field"><label>上傳獎品 CSV</label><input type="file" accept=".csv,text/csv" data-prize-file><div class="hint">欄位格式：品名,數量。例如：頭獎禮盒,1</div></div>
              ${tablePrizes(prizesWithCount)}
            </section>
            <section class="subpanel">
              <div class="subpanel-head"><h3>中獎紀錄</h3><span class="muted">不在場者會排除，不再抽回同一人。</span></div>
              ${tableWinners(record.winners)}
            </section>
          </div>
        </div>
      </section>`;
    bind(activity.id, registrations);
  }

  function empty(text) {
    return `<div class="empty">${esc(text)}</div>`;
  }

  function bind(activityId, registrations) {
    document.querySelector("[data-lottery-activity]")?.addEventListener("change", (event) => render(event.target.value));
    document.querySelector("[data-lottery-print]")?.addEventListener("click", () => window.print());
    document.querySelector("[data-lottery-clear]")?.addEventListener("click", () => clearLottery(activityId));
    document.querySelector("[data-lottery-export]")?.addEventListener("click", () => exportCsv(activityId));
    document.querySelector("[data-lottery-start]")?.addEventListener("click", () => draw(activityId, registrations));
    document.querySelector("[data-lottery-test]")?.addEventListener("click", () => testDraw(activityId, registrations));
    document.querySelector("[data-prize-template]")?.addEventListener("click", downloadPrizeTemplate);
    document.querySelector("[data-prize-add]")?.addEventListener("click", () => addPrize(activityId));
    document.querySelector("[data-prize-save]")?.addEventListener("click", () => savePrizeInputs(activityId, true));
    document.querySelector("[data-prize-file]")?.addEventListener("change", importPrizeFile.bind(null, activityId));
    document.querySelectorAll("[data-prize-delete]").forEach((button) => button.addEventListener("click", () => deletePrize(activityId, button.dataset.prizeDelete)));
    document.querySelectorAll("[data-lottery-redraw]").forEach((button) => button.addEventListener("click", () => redraw(activityId, registrations, button.dataset.lotteryRedraw)));
    document.querySelectorAll("[data-lottery-remove]").forEach((button) => button.addEventListener("click", () => removeWinner(activityId, button.dataset.lotteryRemove)));
  }

  function savePrizeInputs(activityId, showMessage = false) {
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    record.prizes.forEach((prize) => {
      prize.name = document.querySelector(`[data-prize-name="${CSS.escape(prize.id)}"]`)?.value.trim() || prize.name;
      prize.quantity = Math.max(1, Number(document.querySelector(`[data-prize-qty="${CSS.escape(prize.id)}"]`)?.value || prize.quantity || 1));
      prize.sort = Number(document.querySelector(`[data-prize-sort="${CSS.escape(prize.id)}"]`)?.value || prize.sort || 0);
    });
    save(data);
    if (showMessage) toast("獎品表已儲存");
    return data;
  }

  function downloadPrizeTemplate() {
    const rows = [
      ["品名", "數量"],
      ["頭獎禮盒", "1"],
      ["參加獎", "10"]
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "TDEA-獎品表範本.xls";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function addPrize(activityId) {
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    record.prizes.push({ id: uid(), name: "新獎品", quantity: 1, sort: record.prizes.length });
    save(data);
    render(activityId);
  }

  function deletePrize(activityId, prizeId) {
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    if (record.winners.some((row) => row.prizeId === prizeId && row.status !== "absent")) return toast("此獎品已有中獎者，請先清除紀錄或保留獎品。");
    record.prizes = record.prizes.filter((item) => item.id !== prizeId);
    save(data);
    render(activityId);
  }

  async function importPrizeFile(activityId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const count = importPrizes(activityId, await file.text());
    render(activityId);
    toast(`已匯入 ${count} 個獎品品項`);
  }

  function draw(activityId, registrations, prizeId = "") {
    savePrizeInputs(activityId);
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    const selectedPrizeId = prizeId || document.querySelector("[data-lottery-prize]")?.value || "";
    const prize = record.prizes.find((item) => item.id === selectedPrizeId);
    if (!prize) return toast("請先建立獎品表，並選擇要抽的獎品。");
    const activeWinners = record.winners.filter((row) => row.status !== "absent");
    const prizeDrawn = activeWinners.filter((row) => row.prizeId === prize.id).length;
    if (prizeDrawn >= Number(prize.quantity || 1)) return toast("這個獎品已抽滿。");
    const excluded = new Set(record.winners.map((row) => row.key));
    const pool = registrations.filter((row) => !excluded.has(row.key));
    if (!pool.length) return toast("沒有可抽的報名者。");
    const winner = shuffle(pool)[0];
    record.winners.push({
      ...winner,
      id: uid(),
      prizeId: prize.id,
      prizeName: prize.name,
      batch: nextBatch(record),
      status: "won",
      time: new Date().toISOString()
    });
    save(data);
    render(activityId);
    toast(`已抽出：${winner.name}，獎品：${prize.name}`);
  }

  function testDraw(activityId, registrations) {
    savePrizeInputs(activityId);
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    const selectedPrizeId = document.querySelector("[data-lottery-prize]")?.value || "";
    const prize = record.prizes.find((item) => item.id === selectedPrizeId) || { name: "測試獎品" };
    const excluded = new Set(record.winners.map((row) => row.key));
    const source = registrations.length ? registrations : sampleRegistrations();
    const pool = source.filter((row) => !excluded.has(row.key));
    const target = document.querySelector("[data-lottery-test-result]");
    if (!pool.length) {
      if (target) {
        target.hidden = false;
        target.innerHTML = `<strong>測試結果</strong><span>目前沒有可抽名單。</span>`;
      }
      return toast("測試失敗：沒有可抽名單。");
    }
    const winner = shuffle(pool)[0];
    if (target) {
      target.hidden = false;
      target.innerHTML = `<strong>測試結果</strong><span>若正式抽獎，會抽出：${esc(winner.name)}，獎品：${esc(prize.name)}。此結果沒有寫入中獎紀錄。</span>`;
    }
    toast(`測試抽獎：${winner.name}`);
  }

  function redraw(activityId, registrations, winnerId) {
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    const winner = record.winners.find((row) => row.id === winnerId);
    if (!winner || winner.status === "absent") return;
    if (!confirm(`確認「${winner.name}」不在場，並重抽「${winner.prizeName}」？`)) return;
    winner.status = "absent";
    winner.absentAt = new Date().toISOString();
    save(data);
    draw(activityId, registrations, winner.prizeId);
  }

  function removeWinner(activityId, winnerId) {
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    const winner = record.winners.find((row) => row.id === winnerId);
    if (!winner) return;
    if (!confirm(`確認清除「${winner.name}」的「${winner.prizeName}」紀錄？清除後獎項名額會回填。`)) return;
    record.winners = record.winners.filter((row) => row.id !== winnerId);
    save(data);
    render(activityId);
    toast("中獎紀錄已清除，獎項名額已回填");
  }

  function nextBatch(record) {
    return record.winners.reduce((max, row) => Math.max(max, Number(row.batch || 0)), 0) + 1;
  }

  function clearLottery(activityId) {
    if (!confirm("確定清除這個活動的抽獎紀錄？獎品表會保留。")) return;
    const data = normalize(load());
    const record = lotteryState(data, activityId);
    record.winners = [];
    save(data);
    render(activityId);
    toast("抽獎紀錄已清除");
  }

  function exportCsv(activityId) {
    const data = normalize(load());
    const rows = lotteryState(data, activityId).winners;
    if (!rows.length) return toast("沒有中獎紀錄可匯出");
    const csv = [["狀態", "獎品", "批次", "會員編號", "姓名/公司", "手機", "Email", "來源", "抽獎時間"]]
      .concat(rows.map((row) => [row.status === "absent" ? "不在場" : "中獎", row.prizeName, row.batch, row.memberNo, row.name, row.phone, row.email, row.source, new Date(row.time).toLocaleString("zh-TW")]))
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "lottery-winners.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function ensureEntrypoints() {
    const nav = document.querySelector(".nav");
    if (nav && !nav.querySelector("[data-lottery-nav]")) {
      const button = document.createElement("button");
      button.dataset.lotteryNav = "true";
      button.textContent = "抽獎管理";
      button.onclick = () => render();
      nav.insertBefore(button, nav.querySelector("[data-nav='preview']") || null);
    }
    document.querySelectorAll("[data-drawer^='activity:']").forEach((button) => {
      const id = button.dataset.drawer.split(":")[1];
      if (button.parentElement?.querySelector(`[data-lottery-link="${CSS.escape(id)}"]`)) return;
      const sep = document.createElement("span");
      sep.className = "muted";
      sep.textContent = " / ";
      const link = document.createElement("button");
      link.className = "link";
      link.dataset.lotteryLink = id;
      link.textContent = "抽獎";
      link.onclick = () => render(id);
      button.parentElement?.insertBefore(sep, button.nextSibling);
      button.parentElement?.insertBefore(link, sep.nextSibling);
    });
  }

  function markActive() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", Boolean(button.dataset.lotteryNav)));
  }

  const style = document.createElement("style");
  style.textContent = `
    .lottery-board{padding:18px}
    .lottery-controls{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr) auto auto;align-items:end;gap:12px;margin-bottom:14px}
    .lottery-message{margin-bottom:14px;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;background:#eff6ff;color:#1d4ed8;font-weight:700}
    .lottery-message.error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
    .lottery-test-result{margin-bottom:14px;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;background:#f0fdf4;color:#166534}
    .lottery-test-result strong{display:block;margin-bottom:4px}
    .lottery-split{display:grid;grid-template-columns:minmax(320px,0.9fr) minmax(420px,1.1fr);gap:16px}
    .subpanel{border:1px solid #e5e7eb;border-radius:8px;background:#fff;overflow:hidden}
    .subpanel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5e7eb}
    .subpanel-head h3{margin:0;font-size:18px}
    .subpanel>.field{padding:14px 16px}
    .compact-input{width:88px}
    .hint{margin-top:6px;color:#64748b;font-size:13px}
    .muted-row{opacity:.72;background:#f8fafc}
    @media(max-width:1100px){.lottery-split,.lottery-controls{grid-template-columns:1fr}}
    @media print{.sidebar,.topbar .actions,.lottery-controls,.toast,.subpanel:first-child{display:none!important}.shell{display:block}.main{padding:0}.panel,.stat,.subpanel{box-shadow:none}}
  `;
  document.head.appendChild(style);

  new MutationObserver(ensureEntrypoints).observe(document.body, { childList: true, subtree: true });
  ensureEntrypoints();
})();
