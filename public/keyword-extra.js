(function () {
  const rows = [
    {
      keyword: "TDEA個人訊息",
      aliases: "",
      purpose: "開啟個人訊息 LIFF，讓會員查看後台發送給自己的訊息與附件。",
      reply: "開啟 LIFF 頁面，系統會用 LINE UID 顯示個人訊息。",
      entry: "https://liff.line.me/2005868456-2jmxqyFU?personalMessages=1",
      owner: "LINE專區 / 個人訊息",
      status: "啟用中"
    },
    {
      keyword: "TDEA跑馬燈",
      aliases: "",
      purpose: "開啟 800 x 800 跑馬燈 LIFF；左鍵簽到贈點 +1，右鍵查詢母站點數。",
      reply: "開啟 LIFF 頁面，系統取得 LINE UID 後執行贈點或查詢點數。",
      entry: "https://liff.line.me/2005868456-2jmxqyFU?marquee=1",
      owner: "LINE專區 / 跑馬燈",
      status: "啟用中"
    }
  ];

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[ch]));
  }

  function maybeKeywordTable(table) {
    const headerCount = table.querySelectorAll("thead th").length;
    if (headerCount < 6) return false;
    return (table.textContent || "").includes("TDEA");
  }

  function appendKeywordRows() {
    document.querySelectorAll("table").forEach((table) => {
      if (!maybeKeywordTable(table)) return;
      const body = table.querySelector("tbody");
      if (!body) return;
      rows.forEach((row) => {
        if ((table.textContent || "").includes(row.keyword) || body.querySelector(`[data-extra-keyword="${CSS.escape(row.keyword)}"]`)) return;
        const tr = document.createElement("tr");
        tr.dataset.extraKeyword = row.keyword;
        tr.innerHTML = `
          <td><strong>${esc(row.keyword)}</strong></td>
          <td>${esc(row.aliases)}</td>
          <td>${esc(row.purpose)}</td>
          <td>${esc(row.reply)}</td>
          <td style="max-width:360px;white-space:normal;word-break:break-all"><a href="${esc(row.entry)}" target="_blank" rel="noopener">${esc(row.entry)}</a></td>
          <td>${esc(row.owner)}</td>
          <td><span class="badge live">${esc(row.status)}</span></td>
        `;
        body.appendChild(tr);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    appendKeywordRows();
    new MutationObserver(appendKeywordRows).observe(document.body, { childList: true, subtree: true });
  });
})();
