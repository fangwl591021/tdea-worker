(() => {
  const api = location.hostname.endsWith("github.io")
    ? "https://tdeawork.fangwl591021.workers.dev"
    : "";

  const app = document.getElementById("app");
  const liffId = "2005868456-cfANNVou";

  if (!app) return;

  let lineProfile = null;
  let identity = null;

  const clean = (v) => String(v ?? "").trim();

  const esc = (v) =>
    clean(v).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));

  function memberTypeLabel(type) {
    if (type === "association") return "協會會員";
    if (type === "vendor") return "廠商會員";
    return "一般會員";
  }

  function installStyle() {
    if (document.getElementById("tdea-mobile-home-style")) return;

    const style = document.createElement("style");
    style.id = "tdea-mobile-home-style";

    style.textContent = `
      *{box-sizing:border-box}
      body{
        margin:0;
        background:#f7faf8;
        color:#12352a;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif
      }

      .tm-home{
        width:min(100%,820px);
        min-height:100vh;
        margin:auto;
        background:#fff
      }

      .tm-summary{
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        min-height:140px;
        color:#fff
      }

      .tm-summary-cell{
        border-right:1px solid rgba(255,255,255,.3);
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:14px 8px;
        cursor:pointer
      }

      .tm-summary-cell:nth-child(1){background:#25a447}
      .tm-summary-cell:nth-child(2){background:#07883f}
      .tm-summary-cell:nth-child(3){
        background:#006c39;
        border-right:0
      }

      .tm-avatar{
        width:66px;
        height:66px;
        margin:0 auto 6px;
        border-radius:50%;
        border:2px solid #fff;
        object-fit:cover;
        display:block;
        background:#e8f5ec
      }

      .tm-member-name{
        font-size:15px;
        font-weight:900
      }

      .tm-member-type{
        margin-top:2px;
        font-size:12px;
        opacity:.92
      }

      .tm-summary-label{
        font-size:15px;
        font-weight:800
      }

      .tm-points{
        font-size:34px;
        line-height:1.05;
        font-weight:950;
        margin-top:4px
      }

      .tm-share-big{
        margin-top:2px;
        font-size:27px;
        line-height:1.05;
        font-weight:950
      }

      .tm-menu-wrap{
        overflow-x:auto;
        scrollbar-width:none;
        border-bottom:1px solid #e5eee9;
        background:#fff
      }

      .tm-menu-wrap::-webkit-scrollbar{display:none}

      .tm-menu{
        display:flex;
        gap:9px;
        min-width:max-content;
        padding:14px 16px
      }

      .tm-menu button{
        min-width:116px;
        min-height:62px;
        padding:8px 16px;
        border:1px solid #cfe7d8;
        border-radius:13px;
        background:#f7fbf8;
        color:#006c39;
        font-size:16px;
        font-weight:900;
        cursor:pointer
      }

      .tm-menu button.active{
        background:#e6f7eb;
        border-color:#6bd88c;
      }

      .tm-content{
        padding:16px
      }

      .tm-title{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:13px
      }

      .tm-title h2{
        margin:0;
        font-size:21px
      }

      .tm-muted{
        color:#7a8d84;
        font-size:13px
      }

      .tm-panel{
        border-top:1px solid #edf2ef;
        padding-top:4px
      }

      .tm-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }

      .tm-action{
        min-height:50px;
        border:1px solid #d5e5dc;
        border-radius:11px;
        background:#fff;
        color:#145f3c;
        font-size:15px;
        font-weight:900;
        cursor:pointer
      }

      .tm-action.primary{
        background:#08b957;
        border-color:#08b957;
        color:#fff
      }

      .tm-tabs{
        display:flex;
        gap:8px;
        margin-bottom:12px
      }

      .tm-tab{
        border:1px solid #cfe0d6;
        border-radius:999px;
        padding:8px 16px;
        background:#fff;
        color:#12653d;
        font-weight:900
      }

      .tm-tab.active{
        background:#07883f;
        color:#fff
      }

      .tm-carousel{
        display:flex;
        gap:12px;
        overflow-x:auto;
        padding-bottom:10px;
        scroll-snap-type:x mandatory
      }

      .tm-card{
        flex:0 0 min(72vw,280px);
        scroll-snap-align:start;
        overflow:hidden;
        border:1px solid #e0e9e4;
        border-radius:14px;
        background:#fff
      }

      .tm-card img{
  width:100%;
  height:auto;
  display:block;
  background:#eef3f0;
}

      .tm-card-body{
  padding:10px;
}

      .tm-card-title{
  display:none;
}

      .tm-card-text{
  display:none;
}

      .tm-card-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:7px;
        margin-top:10px
      }

      .tm-card-actions button{
        min-height:38px;
        border:0;
        border-radius:8px;
        font-weight:900
      }

      .tm-card-actions .primary{
        background:#08b957;
        color:#fff
      }

      .tm-loading,.tm-empty,.tm-error{
        padding:16px;
        border-radius:10px
      }

      .tm-loading,.tm-empty{
        background:#f3f7f5;
        color:#62756b
      }

      .tm-error{
        background:#fff1f1;
        color:#a82121
      }

      @media(max-width:520px){
        .tm-summary{min-height:128px}
        .tm-avatar{width:58px;height:58px}
        .tm-points{font-size:30px}
        .tm-share-big{font-size:24px}
        .tm-menu button{
          min-width:108px;
          min-height:58px;
          font-size:15px
        }
      }
    `;

    document.head.appendChild(style);
  }

  async function ensureLiff() {
    if (!window.liff) {
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src="https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      });
    }

    await liff.init({ liffId });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      return null;
    }

    const p = await liff.getProfile();

    return {
      lineUserId: clean(p.userId),
      displayName: clean(p.displayName),
      pictureUrl: clean(p.pictureUrl)
    };
  }

  async function loadIdentity() {
    const response = await fetch(
      `${api}/api/identity/me`,
      {
        cache:"no-store",
        headers:{
          "x-line-user-id":lineProfile.lineUserId
        }
      }
    );

    const result = await response.json().catch(()=>({}));

    if (response.status === 404) {
      location.replace(`${location.origin}/?checkinModule=1`);
      return null;
    }

    if (!response.ok || result.success !== true) {
      throw new Error(result.message || "無法讀取會員身分");
    }

    return {
      ...(result.data || {}),
      pictureUrl:
        clean(result.data?.pictureUrl) ||
        lineProfile.pictureUrl
    };
  }

  function renderShell() {
    app.innerHTML = `
      <main class="tm-home">

        <section class="tm-summary">

          <div class="tm-summary-cell" data-top="member">
            <div>
              ${identity.pictureUrl
                ? `<img class="tm-avatar" src="${esc(identity.pictureUrl)}">`
                : ""
              }
              <div class="tm-member-name">${esc(identity.name)}</div>
              <div class="tm-member-type">
                ${esc(memberTypeLabel(identity.memberType))}
                ${identity.memberNo ? ` · ${esc(identity.memberNo)}` : ""}
              </div>
            </div>
          </div>

          <div class="tm-summary-cell" data-top="points">
            <div>
              <div class="tm-summary-label">TDEA 點數</div>
              <div class="tm-points" data-point-balance>--</div>
            </div>
          </div>

          <div class="tm-summary-cell" data-top="share">
            <div>
              <div class="tm-summary-label">專屬 QR</div>
              <div class="tm-share-big">分享</div>
            </div>
          </div>

        </section>

        <div class="tm-menu-wrap">
          <nav class="tm-menu">
            <button data-page="cards">名片收藏</button>
            <button data-page="match">智能配對</button>
            <button data-page="activities">活動專區</button>
            <button data-page="calendar">個人行程</button>
            <button data-page="home" class="active">首頁</button>
          </nav>
        </div>

        <section class="tm-content" data-content></section>

      </main>
    `;

    app.querySelector("[data-top='member']")
      ?.addEventListener("click", showMember);

    app.querySelector("[data-top='points']")
      ?.addEventListener("click", showPoints);

    app.querySelector("[data-top='share']")
      ?.addEventListener("click", () => {
        location.href = `${location.origin}/?memberQr=1`;
      });

    app.querySelectorAll("[data-page]").forEach((button)=>{
      button.addEventListener("click",()=>{
        app.querySelectorAll("[data-page]")
          .forEach((b)=>b.classList.remove("active"));

        button.classList.add("active");

        const page=button.dataset.page;

        if(page==="cards") return showCards();
        if(page==="match") return showMatch();
        if(page==="activities") return showActivities();
        if(page==="points") return showPoints();
        if(page==="calendar") return showCalendar();

        showHome();
      });
    });
  }

  function content(html) {
    const root=app.querySelector("[data-content]");
    if(root) root.innerHTML=html;
  }

  function showHome() {
    content(`
      <div class="tm-title">
        <h2>近期活動</h2>
        <span class="tm-muted">課程・會員・廠商</span>
      </div>
      <div class="tm-loading">正在讀取活動...</div>
    `);

    loadActivities("course");
  }

  function showMember() {
    content(`
      <div class="tm-title">
        <h2>會員專區</h2>
      </div>

      <div class="tm-panel">
        <p><strong>${esc(identity.name)}</strong></p>
        <p>${esc(memberTypeLabel(identity.memberType))}
          ${identity.memberNo ? ` · ${esc(identity.memberNo)}` : ""}
        </p>

        <div class="tm-actions">
          <button class="tm-action primary" data-member-qr>會員 QR</button>
          <button class="tm-action" data-my-register>我的報名</button>
        </div>
      </div>
    `);

    app.querySelector("[data-member-qr]")
      ?.addEventListener("click",()=>{
        location.href=`${location.origin}/?memberQr=1`;
      });

    app.querySelector("[data-my-register]")
      ?.addEventListener("click",()=>{
        location.href=`${location.origin}/?query=1`;
      });
  }

  function showCards() {
    content(`
      <div class="tm-title">
        <h2>名片收藏</h2>
        <span class="tm-muted">我的人脈名片</span>
      </div>

      <div class="tm-actions">
        <button class="tm-action primary" data-card>拍照收藏名片</button>
        <button class="tm-action" data-card>我的名片收藏</button>
      </div>
    `);

    app.querySelectorAll("[data-card]").forEach((button)=>{
      button.addEventListener("click",()=>{
        location.href=`${location.origin}/?cardCollection=1`;
      });
    });
  }

  function showMatch() {
    content(`
      <div class="tm-title">
        <h2>智能配對</h2>
      </div>
      <div class="tm-empty">
        後續接名片收藏的智能配對功能。
      </div>
    `);
  }

  function showPoints() {
    content(`
      <div class="tm-title">
        <h2>點數專區</h2>
      </div>
      <div class="tm-empty">
        點數餘額、點數紀錄、活動贈點與店家折抵將集中在這裡。
      </div>
    `);
  }

  function showCalendar() {
    content(`
      <div class="tm-title">
        <h2>個人行程</h2>
      </div>

      <button class="tm-action primary" data-calendar>
        開啟我的行程
      </button>
    `);

    app.querySelector("[data-calendar]")
      ?.addEventListener("click",()=>{
        location.href=`${location.origin}/?calendar=1`;
      });
  }

  function showActivities() {
    content(`
      <div class="tm-title">
        <h2>活動專區</h2>
        <span class="tm-muted">課程與廠商輪播</span>
      </div>

      <div class="tm-tabs">
        <button class="tm-tab active" data-activity-tab="course">
          課程活動
        </button>
        <button class="tm-tab" data-activity-tab="vendor">
          廠商輪播
        </button>
      </div>

      <div data-activity-area>
        <div class="tm-loading">正在讀取活動...</div>
      </div>
    `);

    app.querySelectorAll("[data-activity-tab]").forEach((button)=>{
      button.addEventListener("click",()=>{
        app.querySelectorAll("[data-activity-tab]")
          .forEach((b)=>b.classList.remove("active"));

        button.classList.add("active");
        loadActivities(button.dataset.activityTab);
      });
    });

    loadActivities("course");
  }

  async function loadActivities(type="course") {
    const area =
      app.querySelector("[data-activity-area]") ||
      app.querySelector("[data-content]");

    if(!area) return;

    try {
      if(type==="vendor"){
        const r=await fetch(`${api}/api/vendor-card-menu`,{
          cache:"no-store"
        });

        const j=await r.json().catch(()=>({}));
        const rows=Array.isArray(j?.data?.items)
          ? j.data.items.filter(x=>x.enabled!==false)
          : [];

        area.innerHTML=renderVendorCards(rows);
        return;
      }

      const r=await fetch(`${api}/api/monthly-activity`,{
        cache:"no-store"
      });

      const j=await r.json().catch(()=>({}));
      const rows=Array.isArray(j?.data?.pages)
        ? j.data.pages
        : [];

      area.innerHTML=renderCourseCards(rows);

      bindCardLinks();

    } catch(error) {
      area.innerHTML=
        `<div class="tm-error">${esc(error.message || "活動讀取失敗")}</div>`;
    }
  }

  function renderCourseCards(rows) {
    const cards = rows
      .filter(x => x && (x.activityName || x.detailTitle || x.imageUrl))
      .map(row => {
        const title = clean(row.activityName || row.detailTitle || "TDEA 活動");
        const image = clean(row.imageUrl || row.formImageUrl);
        const formUrl = clean(row.formUrl || "");
        const detailUrl = clean(row.detailUrl || formUrl || "");

        return `
          <article class="tm-card">
            ${image ? `<img src="${esc(image)}" alt="${esc(title)}">` : ""}
            <div class="tm-card-body">
              <div class="tm-card-actions">
                ${formUrl
                  ? `<button class="primary" data-open="${esc(formUrl)}">報名</button>`
                  : `<button class="primary" data-open="${esc(detailUrl)}">詳細內容</button>`
                }
                <button data-open="${esc(detailUrl)}">詳細內容</button>
              </div>
            </div>
          </article>
        `;
      }).join("");

    return cards
      ? `<div class="tm-carousel">${cards}</div>`
      : `<div class="tm-empty">目前沒有活動。</div>`;
  }

  function renderVendorCards(rows) {
    const cards = rows.map(row => {
      const image = clean(row.imageUrl || "");
      const detailUrl = clean(row.linkUrl || row.url || "");
      const title = clean(row.name || row.label || "合作廠商");

      return `
        <article class="tm-card">
          ${image ? `<img src="${esc(image)}" alt="${esc(title)}">` : ""}
          <div class="tm-card-body">
            <div class="tm-card-actions">
              <button class="primary" data-open="${esc(detailUrl)}">詳細內容</button>
              <button data-open="${esc(detailUrl)}">前往查看</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    return cards
      ? `<div class="tm-carousel">${cards}</div>`
      : `<div class="tm-empty">目前沒有廠商輪播。</div>`;
  }

  function bindCardLinks() {
    app.querySelectorAll("[data-open]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const url=clean(button.dataset.open);
        if(url) location.href=url;
      });
    });
  }

  async function start() {
    installStyle();

    app.innerHTML=`
      <div class="tm-loading">正在載入 TDEA 行動首頁...</div>
    `;

    try {
      lineProfile=await ensureLiff();
      if(!lineProfile) return;

      identity=await loadIdentity();
      if(!identity) return;

      renderShell();
      showHome();

    } catch(error) {
      app.innerHTML=
        `<div class="tm-error">${esc(error.message || "首頁載入失敗")}</div>`;
    }
  }

  start();
})();


