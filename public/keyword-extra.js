(function () {
  const rows = [
    {
      keyword: "TDEA個人訊息",
      aliases: "",
      purpose: "開啟個人訊息 LIFF，會員可查看協會傳送的一則則訊息與附件。",
      reply: "回覆 LIFF 按鈕，點開後依 LINE UID 顯示個人訊息。",
      entry: "https://liff.line.me/2005868456-2jmxqyFU?personalMessages=1",
      owner: "LINE專區 / 個人訊息",
      status: "啟用中"
    },
    {
      keyword: "TDEA跑馬燈",
      aliases: "",
      purpose: "開啟 800 x 800 跑馬燈 LIFF，左鍵寫入母站簽到贈點，右鍵查詢母站點數。",
      reply: "回覆 LIFF 按鈕，會員左鍵依 LINE UID 寫入 +1 點，右鍵查詢目前點數餘額。",
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
    const text = table.textContent || "";
    return text.includes("TDEA");
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
