(() => {
  const workerApi = "https://tdeawork.fangwl591021.workers.dev";
  const uidRe = /U[0-9a-f]{32}/i;
  const memberNoRe = /[A-Z]\d{7}/i;

  function show(message) {
    let box = document.getElementById("tdea-aiwe-scraper-status");
    if (!box) {
      box = document.createElement("div");
      box.id = "tdea-aiwe-scraper-status";
      box.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:999999;background:#111827;color:#fff;padding:14px 16px;border-radius:8px;font:14px/1.5 system-ui, sans-serif;max-width:420px;box-shadow:0 12px 35px rgba(0,0,0,.25);white-space:pre-wrap";
      document.body.appendChild(box);
    }
    box.textContent = message;
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function columnIndex(headers, words) {
    return headers.findIndex((header) => words.some((word) => header.includes(word)));
  }

  function textAt(cells, index) {
    return index >= 0 && cells[index] ? clean(cells[index].textContent) : "";
  }

  function parseMemberName(value) {
    const memberNo = value.match(memberNoRe)?.[0]?.toUpperCase() || "";
    const name = clean(value.replace(memberNoRe, ""));
    return { memberNo, name };
  }

  function parseDocument(doc, sourceUrl) {
    const table = doc.querySelector("table.wp-list-table") || doc.querySelector("table");
    if (!table) return [];
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => clean(th.textContent));
    const usernameIdx = columnIndex(headers, ["使用者名稱", "帳號", "Username"]);
    const emailIdx = columnIndex(headers, ["電子郵件", "Email"]);
    const roleIdx = columnIndex(headers, ["使用者角色", "角色", "Role"]);
    const registeredIdx = columnIndex(headers, ["註冊日期", "Registered"]);
    const expiresIdx = columnIndex(headers, ["有效日期", "到期", "Expires"]);
    const memberNameIdx = columnIndex(headers, ["會員姓名", "姓名", "Name"]);
    const companyIdx = columnIndex(headers, ["公司", "廠商"]);

    return Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => {
        const cells = Array.from(row.children);
        const rowText = clean(row.textContent);
        const email = textAt(cells, emailIdx) || rowText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
        const lineUserId = rowText.match(uidRe)?.[0] || email.match(uidRe)?.[0] || textAt(cells, usernameIdx).match(uidRe)?.[0] || "";
        const memberSource = textAt(cells, memberNameIdx) || rowText;
        const parsed = parseMemberName(memberSource);
        const fallbackMemberNo = rowText.match(memberNoRe)?.[0]?.toUpperCase() || "";
        const userNameText = textAt(cells, usernameIdx).replace(uidRe, "");
        const name = parsed.name || clean(memberSource.replace(fallbackMemberNo, "")) || userNameText;
        return {
          lineUserId,
          email,
          memberNo: parsed.memberNo || fallbackMemberNo,
          name,
          companyName: textAt(cells, companyIdx),
          role: textAt(cells, roleIdx),
          registeredAt: textAt(cells, registeredIdx),
          expiresAt: textAt(cells, expiresIdx),
          sourceUrl
        };
      })
      .filter((item) => item.lineUserId || item.memberNo || item.email || item.name);
  }

  async function fetchMembers(url) {
    const response = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error(`讀取失敗 ${response.status}: ${url}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return parseDocument(doc, url);
  }

  function pageUrl(page) {
    const url = new URL(location.href);
    url.searchParams.set("paged", String(page));
    return url.href;
  }

  async function main() {
    if (!location.hostname.endsWith("aiwe.cc")) {
      alert("請先在 aiwe.cc 的會員列表或使用者列表頁面執行這段擷取器。");
      return;
    }

    const current = new URL(location.href).searchParams.get("paged") || "1";
    const maxPages = Number(prompt("要擷取幾頁？先用 1 測試；確認欄位正確後再增加。", current === "1" ? "1" : current) || "1");
    if (!Number.isFinite(maxPages) || maxPages < 1) return;

    const adminEmail = prompt("TDEA 匯入授權 Email", "admin@example.com") || "";
    if (!adminEmail.trim()) return;

    const all = [];
    for (let page = 1; page <= maxPages; page += 1) {
      show(`TDEA 擷取器\n正在讀取第 ${page} / ${maxPages} 頁...\n目前累計 ${all.length} 筆`);
      const rows = await fetchMembers(pageUrl(page));
      all.push(...rows);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const unique = Array.from(new Map(all.map((item) => [item.lineUserId || item.memberNo || item.email || item.name, item])).values());
    show(`TDEA 擷取器\n已擷取 ${unique.length} 筆，正在上傳...`);

    const response = await fetch(`${workerApi}/api/aiwe-members/import`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": adminEmail.trim() },
      body: JSON.stringify({ source: location.href, members: unique })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) throw new Error(result.message || `上傳失敗 ${response.status}`);

    show(`TDEA 擷取器\n完成：本次 ${unique.length} 筆，總計 ${result.total} 筆。`);
    console.table(unique.slice(0, 20));
  }

  main().catch((error) => {
    show(`TDEA 擷取器錯誤\n${error.message || error}`);
    console.error(error);
  });
})();
