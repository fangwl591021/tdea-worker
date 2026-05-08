(() => {
  const key = "tdea-manager-v2";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const viewText = {
    dashboard: ["活動總覽", "查看活動狀態、報名與簽到概況。"],
    association: ["協會名冊", "維護協會會員資料與會員資格。"],
    vendor: ["廠商名冊", "維護廠商會員、統編、窗口與備註。"],
    creator: ["創建活動", "建立活動草稿，之後可直接改接 D1。"],
    preview: ["用戶預覽", "模擬一般使用者看到的活動報名頁。"]
  };
  const state = { view: "dashboard", drawer: "", data: load() };

  function uid() { return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function num(v) { return Number(v || 0).toLocaleString("zh-TW"); }
  function save() { localStorage.setItem(key, JSON.stringify(state.data)); }
  function load() {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (_) {}
    return {
      activities: [
        { id: uid(), name: "中秋聯歡活動", type: "聯誼類", courseTime: "2026/09/20 14:00", deadline: "2026/09/10", capacity: 80, reg: 0, check: 0, status: "上架", formUrl: "" },
        { id: uid(), name: "AI 教學工作坊", type: "教學類", courseTime: "2026/06/15 10:00", deadline: "2026/06/08", capacity: 40, reg: 0, check: 0, status: "下架", formUrl: "" }
      ],
      association: [],
      vendor: []
    };
  }

  function render() {
    const [title, sub] = viewText[state.view];
    document.querySelector("#app").innerHTML = `
      <div class="shell">
        <aside class="sidebar"><div class="brand">TDEA 管理中心</div><nav class="nav">${nav("dashboard", "活動總覽")}${nav("association", "協會名冊")}${nav("vendor", "廠商名冊")}${nav("creator", "創建活動")}${nav("preview", "用戶預覽")}</nav></aside>
        <main class="main"><div class="topbar"><div><h1>${title}</h1><div class="subtitle">${sub}</div></div><div class="actions">${actions()}</div></div>${body()}</main>
      </div>${drawer()}<div class="toast" id="toast"></div>`;
    bind();
  }

  function nav(id, label) { return `<button class="${state.view === id ? "active" : ""}" data-nav="${id}">${label}</button>`; }
  function actions() {
    if (state.view === "association") return `<button class="btn primary" data-drawer="association:new">新增協會會員</button>`;
    if (state.view === "vendor") return `<button class="btn primary" data-drawer="vendor:new">新增廠商會員</button>`;
    if (state.view === "creator") return `<button class="btn" data-reset>清空表單</button>`;
    if (state.view === "preview") return `<button class="btn" data-copy>複製預覽網址</button>`;
    return `<button class="btn" data-worker>檢查 Worker</button><button class="btn primary" data-nav="creator">新增活動</button>`;
  }
  function body() {
    if (state.view === "association") return memberView("association");
    if (state.view === "vendor") return memberView("vendor");
    if (state.view === "creator") return creator();
    if (state.view === "preview") return preview();
    return dashboard();
  }

  function dashboard() {
    const a = state.data.activities;
    const live = a.filter(x => x.status === "上架").length;
    const reg = a.reduce((s, x) => s + Number(x.reg || 0), 0);
    const chk = a.reduce((s, x) => s + Number(x.check || 0), 0);
    return `<div class="grid stats">${stat("活動數", a.length)}${stat("上架中", live)}${stat("報名人數", reg)}${stat("簽到人數", chk)}</div><section class="panel"><div class="panel-head"><h2 class="panel-title">活動清單</h2><button class="btn" data-seed>匯入範例</button></div>${a.length ? activityTable(a) : empty("目前沒有活動")}</section>`;
  }
  function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${num(value)}</strong></div>`; }
  function activityTable(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>類型</th><th>課程時間</th><th>報名</th><th>簽到</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.type)}</td><td>${esc(x.courseTime || "-")}</td><td>${num(x.reg)}</td><td>${num(x.check)}</td><td><span class="badge ${x.status === "上架" ? "live" : "off"}">${x.status}</span></td><td><button class="link" data-drawer="activity:${x.id}">編輯</button><span class="muted"> / </span><button class="link" data-toggle="${x.id}">${x.status === "上架" ? "下架" : "上架"}</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function memberView(type) {
    const rows = state.data[type];
    const vendor = type === "vendor";
    if (!rows.length) return `<section class="panel">${empty(`目前沒有${vendor ? "廠商會員" : "協會會員"}資料`)}</section>`;
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><button class="btn" data-export>匯出備份</button></div><div class="table-wrap"><table><thead><tr><th>會員編號</th><th>${vendor ? "公司名稱" : "姓名"}</th><th>${vendor ? "統編" : "身分"}</th><th>${vendor ? "聯絡窗口" : "性別"}</th><th>資格</th><th>備註</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.memberNo)}</td><td><strong>${esc(vendor ? x.companyName : x.name)}</strong></td><td>${esc(vendor ? x.taxId : x.identity)}</td><td>${esc(vendor ? x.contact : x.gender)}</td><td><span class="badge ${x.qualification === "Y" ? "live" : "off"}">${esc(x.qualification)}</span></td><td>${esc(x.note)}</td><td><button class="link" data-drawer="${type}:${x.id}">編輯</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function creator() {
    return `<div class="split"><form class="form-card form-grid" id="activity-form">${field("活動名稱", "name", "", "例如：AI 教學工作坊", true)}${select("活動類型", "type", ["講座類", "教學類", "聯誼類"])}${field("課程時間", "courseTime", "", "YYYY/MM/DD HH:MM")}${field("報名截止", "deadline", "", "YYYY/MM/DD")}${field("人數限制", "capacity", 0, "", false, "number")}${select("狀態", "status", ["下架", "上架"])}<button class="btn primary" type="submit">建立活動</button></form><section class="panel"><div class="panel-head"><h2 class="panel-title">最近活動</h2></div>${state.data.activities.length ? activityTable(state.data.activities.slice(0, 5)) : empty("尚未建立活動")}</section></div>`;
  }

  function preview() {
    const rows = state.data.activities.filter(x => x.status === "上架");
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">官方活動預約</h2><span class="muted">TDEA 台灣數位教育發展協會</span></div><div style="padding:18px">${rows.length ? `<div class="cards">${rows.map(x => `<article class="activity-card"><span class="badge live">${esc(x.type)}</span><h3>${esc(x.name)}</h3><div class="info-row"><span>課程時間</span><strong>${esc(x.courseTime || "未定")}</strong></div><div class="info-row"><span>截止</span><strong>${esc(x.deadline || "未定")}</strong></div><div class="info-row"><span>名額</span><strong>${esc(x.capacity || "不限")}</strong></div><div class="info-row"><span>狀況</span><strong>${num(x.reg)} 人報名</strong></div><button class="btn primary" style="width:100%;margin-top:14px" data-register="${x.id}">立即報名</button></article>`).join("")}</div>` : empty("目前暫無開放中的活動")}</div></section>`;
  }

  function drawer() {
    if (!state.drawer) return `<div class="drawer" id="drawer"></div>`;
    const [type, rowId] = state.drawer.split(":");
    const title = type === "activity" ? "編輯活動" : type === "vendor" ? "編輯廠商會員" : "編輯協會會員";
    return `<div class="drawer open" id="drawer"><div class="drawer-backdrop" data-close></div><div class="drawer-panel"><div class="drawer-title"><h2>${title}</h2><button class="btn icon" data-close>×</button></div>${type === "activity" ? activityForm(rowId) : memberForm(type, rowId)}</div></div>`;
  }
  function activityForm(rowId) {
    const x = state.data.activities.find(r => r.id === rowId) || {};
    return `<form class="form-grid" id="drawer-activity">${hidden("id", x.id)}${field("活動名稱", "name", x.name)}${select("類型", "type", ["講座類", "教學類", "聯誼類"], x.type)}${field("課程時間", "courseTime", x.courseTime)}${field("報名截止", "deadline", x.deadline)}${field("人數限制", "capacity", x.capacity, "", false, "number")}${field("報名人數", "reg", x.reg, "", false, "number")}${field("簽到人數", "check", x.check, "", false, "number")}${select("狀態", "status", ["上架", "下架"], x.status)}${field("表單連結", "formUrl", x.formUrl)}<button class="btn primary" type="submit">儲存</button></form>`;
  }
  function memberForm(type, rowId) {
    const x = state.data[type].find(r => r.id === rowId) || {};
    const vendor = type === "vendor";
    return `<form class="form-grid" id="drawer-member" data-type="${type}">${hidden("id", x.id)}${field("會員編號", "memberNo", x.memberNo)}${vendor ? `${field("公司名稱", "companyName", x.companyName)}${field("統一編號", "taxId", x.taxId)}${field("負責人", "owner", x.owner)}${field("聯絡窗口", "contact", x.contact)}` : `${field("身分", "identity", x.identity)}${field("姓名", "name", x.name)}${select("性別", "gender", ["", "男", "女"], x.gender)}`}${select("會員資格", "qualification", ["Y", "N"], x.qualification || "Y")}<div class="field"><label>備註</label><textarea name="note">${esc(x.note)}</textarea></div><button class="btn primary" type="submit">儲存</button></form>`;
  }

  function field(label, name, value = "", placeholder = "", required = false, type = "text") { return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}></div>`; }
  function select(label, name, options, value = "") { return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`; }
  function hidden(name, value = "") { return `<input type="hidden" name="${name}" value="${esc(value)}">`; }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }

  function bind() {
    document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { state.view = b.dataset.nav; state.drawer = ""; render(); });
    document.querySelectorAll("[data-drawer]").forEach(b => b.onclick = () => { state.drawer = b.dataset.drawer; render(); });
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { state.drawer = ""; render(); });
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => { const x = state.data.activities.find(r => r.id === b.dataset.toggle); if (x) x.status = x.status === "上架" ? "下架" : "上架"; save(); render(); });
    document.querySelectorAll("[data-register]").forEach(b => b.onclick = () => { const x = state.data.activities.find(r => r.id === b.dataset.register); if (x) x.reg = Number(x.reg || 0) + 1; save(); toast("已模擬新增一筆報名"); render(); });
    const af = document.querySelector("#activity-form"); if (af) af.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(af)); state.data.activities.unshift({ id: uid(), name: d.name.trim(), type: d.type, courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), reg: 0, check: 0, status: d.status, formUrl: "" }); save(); state.view = "dashboard"; render(); toast("活動已建立"); };
    const ea = document.querySelector("#drawer-activity"); if (ea) ea.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(ea)); const x = state.data.activities.find(r => r.id === d.id); if (x) Object.assign(x, { name: d.name, type: d.type, courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), reg: Number(d.reg || 0), check: Number(d.check || 0), status: d.status, formUrl: d.formUrl }); state.drawer = ""; save(); render(); toast("活動已儲存"); };
    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = e => { e.preventDefault(); const type = mf.dataset.type; const d = Object.fromEntries(new FormData(mf)); const rows = state.data[type]; const old = rows.find(r => r.id === d.id); const item = { ...d, id: d.id || uid() }; old ? Object.assign(old, item) : rows.unshift(item); state.drawer = ""; save(); render(); toast("名冊已儲存"); };
    const seed = document.querySelector("[data-seed]"); if (seed) seed.onclick = () => { state.data.association = [{ id: uid(), memberNo: "A001", identity: "理事", name: "王小明", gender: "男", qualification: "Y", note: "" }, { id: uid(), memberNo: "A002", identity: "會員", name: "陳美玲", gender: "女", qualification: "Y", note: "可協助活動報到" }]; state.data.vendor = [{ id: uid(), memberNo: "V001", companyName: "數位教育股份有限公司", taxId: "12345678", owner: "林先生", contact: "Amy", qualification: "Y", note: "" }]; save(); render(); toast("範例資料已匯入"); };
    const worker = document.querySelector("[data-worker]"); if (worker) worker.onclick = async () => { try { const r = await fetch(api + "/api/activities"); const j = await r.json(); toast(j.success ? "Worker API 連線正常" : "Worker API 回應異常"); } catch (_) { toast("Worker API 無法連線"); } };
    const exp = document.querySelector("[data-export]"); if (exp) exp.onclick = () => { navigator.clipboard.writeText(JSON.stringify(state.data, null, 2)); toast("備份 JSON 已複製"); };
    const copy = document.querySelector("[data-copy]"); if (copy) copy.onclick = () => { navigator.clipboard.writeText(location.href); toast("預覽網址已複製"); };
    const reset = document.querySelector("[data-reset]"); if (reset) reset.onclick = () => { const f = document.querySelector("#activity-form"); if (f) f.reset(); };
  }
  function toast(text) { const el = document.querySelector("#toast"); if (!el) return; el.textContent = text; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
  render();
})();
