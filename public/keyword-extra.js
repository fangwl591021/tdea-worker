(function () {
  const row = {
    keyword: "TDEA個人訊息",
    aliases: "無",
    purpose: "讓會員開啟個人訊息 LIFF，查看協會傳送的通知與附件。",
    reply: "回覆 LIFF 按鈕；後台可從會員名冊或廠商名冊發送個人訊息。",
    entry: "https://liff.line.me/2005868456-2jmxqyFU?personalMessages=1",
    owner: "LINE專區 / 個人訊息",
    status: "啟用中"
  };

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
    return text.includes("TDEA") && !text.includes(row.keyword);
  }

  function appendKeywordRow() {
    document.querySelectorAll("table").forEach((table) => {
      if (!maybeKeywordTable(table)) return;
      const body = table.querySelector("tbody");
      if (!body) return;
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
  }

  document.addEventListener("DOMContentLoaded", () => {
    appendKeywordRow();
    new MutationObserver(appendKeywordRow).observe(document.body, { childList: true, subtree: true });
  });
})();
