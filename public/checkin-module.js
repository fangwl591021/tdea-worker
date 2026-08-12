(() => {
  const api = location.hostname.endsWith("github.io")
    ? "https://tdeawork.fangwl591021.workers.dev"
    : "";

  const app = document.getElementById("app");
  const liffId = "2005868456-cfANNVou";

  if (!app) return;

  let lineProfile = null;

  const clean = (value) =>
    String(value ?? "").trim();

  const esc = (value) =>
    clean(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[ch]));

  function installStyle() {
    if (document.getElementById("tdea-checkin-module-style")) return;

    const style = document.createElement("style");
    style.id = "tdea-checkin-module-style";
    style.textContent = `
      body{
        margin:0;
        background:#f3f6f9;
        color:#101828;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif
      }
      .ci-shell{
        max-width:720px;
        margin:0 auto;
        padding:20px 14px 48px
      }
      .ci-card{
        background:#fff;
        border:1px solid #e4e7ec;
        border-radius:16px;
        box-shadow:0 12px 32px rgba(15,23,42,.07);
        overflow:hidden
      }
      .ci-head{
        padding:22px;
        background:#fff
      }
      .ci-head h1{
        margin:0 0 6px;
        font-size:26px
      }
      .ci-head p{
        margin:0;
        color:#667085
      }
      .ci-body{
        display:grid;
        gap:18px;
        padding:22px;
        border-top:1px solid #eaecf0
      }
      .ci-loading,.ci-ok,.ci-error{
        padding:14px 16px;
        border-radius:10px;
        font-weight:800
      }
      .ci-loading{
        background:#f2f4f7;
        color:#344054
      }
      .ci-ok{
        background:#ecfdf3;
        color:#067647;
        border:1px solid #abefc6
      }
      .ci-error{
        background:#fff3f0;
        color:#b42318;
        border:1px solid #fecdca
      }
      .ci-profile{
        display:flex;
        align-items:center;
        gap:12px
      }
      .ci-avatar{
        width:54px;
        height:54px;
        border-radius:999px;
        object-fit:cover;
        background:#f2f4f7
      }
      .ci-form{
        display:grid;
        gap:16px
      }
      .ci-field{
        display:grid;
        gap:7px
      }
      .ci-field label{
        font-weight:800
      }
      .ci-field input{
        box-sizing:border-box;
        width:100%;
        min-height:48px;
        border:1px solid #d0d5dd;
        border-radius:9px;
        padding:10px 12px;
        font-size:16px
      }
      .ci-types{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:8px
      }
      .ci-type{
        position:relative
      }
      .ci-type input{
        position:absolute;
        opacity:0;
        pointer-events:none
      }
      .ci-type span{
        display:flex;
        min-height:48px;
        align-items:center;
        justify-content:center;
        border:1px solid #d0d5dd;
        border-radius:9px;
        font-weight:900;
        cursor:pointer
      }
      .ci-type input:checked + span{
        border-color:#06c755;
        background:#ecfdf3;
        color:#067647
      }
      .ci-btn{
        min-height:50px;
        border:0;
        border-radius:9px;
        padding:12px 16px;
        font-size:16px;
        font-weight:900;
        cursor:pointer
      }
      .ci-btn.primary{
        background:#06c755;
        color:#fff
      }
      .ci-btn.secondary{
        background:#fff;
        border:1px solid #d0d5dd;
        color:#344054
      }
      .ci-btn[disabled]{
        opacity:.6;
        cursor:wait
      }
      .ci-member{
        display:grid;
        gap:10px
      }
      .ci-row{
        display:grid;
        grid-template-columns:105px 1fr;
        gap:10px
      }
      .ci-row span{
        color:#667085
      }
      .ci-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-top:8px
      }
      .ci-note{
        color:#667085;
        font-size:14px;
        line-height:1.6
      }
      @media(max-width:560px){
        .ci-types,.ci-actions{
          grid-template-columns:1fr
        }
      }
    `;
    document.head.appendChild(style);
  }

  function shell(content) {
    installStyle();

    app.innerHTML = `
      <main class="ci-shell">
        <section class="ci-card">
          <header class="ci-head">
            <h1>TDEA 會員服務</h1>
            <p>會員身分一次建立，後續報名與簽到直接使用。</p>
          </header>
          <div class="ci-body">${content}</div>
        </section>
      </main>
    `;
  }

  function loading(text) {
    shell(`<div class="ci-loading">${esc(text)}</div>`);
  }

  function error(message) {
    shell(`
      <div class="ci-error">${esc(message)}</div>
      <button class="ci-btn secondary" type="button" onclick="location.reload()">重新載入</button>
    `);
  }

  async function ensureLiff() {
    if (!window.liff) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    await window.liff.init({ liffId });

    if (!window.liff.isLoggedIn()) {
      window.liff.login({
        redirectUri: location.href
      });
      return null;
    }

    const profile = await window.liff.getProfile();

    lineProfile = {
      lineUserId: clean(profile.userId),
      lineDisplayName: clean(profile.displayName),
      pictureUrl: clean(profile.pictureUrl)
    };

    return lineProfile;
  }

  async function loadIdentity() {
    const response = await fetch(
      `${api}/api/identity/me`,
      {
        cache: "no-store",
        headers: {
          "x-line-user-id": lineProfile.lineUserId
        }
      }
    );

    const result = await response
      .json()
      .catch(() => ({}));

    if (response.status === 404 &&
        result.code === "identity_not_found") {
      return null;
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.message || "無法讀取會員身分"
      );
    }

    return result.data || null;
  }

  function goHome() {
    const url = new URL(location.href);

    url.search = "";
    url.hash = "";

    location.replace(url.toString());
  }

  function memberTypeLabel(type) {
    if (type === "association") return "協會會員";
    if (type === "vendor") return "廠商會員";
    return "一般會員";
  }

  function renderIdentity(identity) {
    shell(`
      ${lineProfile.pictureUrl ? `
        <div class="ci-profile">
          <img class="ci-avatar" src="${esc(lineProfile.pictureUrl)}" alt="">
          <div>
            <strong>${esc(identity.name || lineProfile.lineDisplayName)}</strong>
            <div class="ci-note">LINE 已登入</div>
          </div>
        </div>
      ` : ""}

      <div class="ci-ok">會員身分已確認</div>

      <div class="ci-member">
        <div class="ci-row">
          <span>姓名</span>
          <strong>${esc(identity.name)}</strong>
        </div>

        <div class="ci-row">
          <span>會員身分</span>
          <strong>${esc(memberTypeLabel(identity.memberType))}</strong>
        </div>

        ${identity.memberNo ? `
          <div class="ci-row">
            <span>會員編號</span>
            <strong>${esc(identity.memberNo)}</strong>
          </div>
        ` : ""}

        <div class="ci-row">
          <span>電話</span>
          <strong>${esc(identity.phone)}</strong>
        </div>

        ${identity.email ? `
          <div class="ci-row">
            <span>電子郵件</span>
            <strong>${esc(identity.email)}</strong>
          </div>
        ` : ""}
      </div>

      <div class="ci-actions">
        <button class="ci-btn primary" type="button" data-registration>
          活動報名
        </button>
        <button class="ci-btn primary" type="button" data-checkin>
          活動簽到
        </button>
      </div>

      <div class="ci-note">
        下一階段會把活動報名與簽到直接依此會員身分處理。
      </div>
    `);

    app.querySelector("[data-registration]")
      ?.addEventListener("click", () => {
        alert("活動報名將在下一階段接入");
      });

    app.querySelector("[data-checkin]")
      ?.addEventListener("click", () => {
        alert("活動簽到將在下一階段接入");
      });
  }

  function renderRegistration() {
    shell(`
      <div class="ci-profile">
        ${lineProfile.pictureUrl
          ? `<img class="ci-avatar" src="${esc(lineProfile.pictureUrl)}" alt="">`
          : ""}
        <div>
          <strong>${esc(lineProfile.lineDisplayName || "LINE 使用者")}</strong>
          <div class="ci-note">第一次使用，請完成會員身分登錄。</div>
        </div>
      </div>

      <form class="ci-form" data-identity-form novalidate>
        <div class="ci-field">
          <label>姓名 *</label>
          <input name="name" required autocomplete="name">
        </div>

        <div class="ci-field">
          <label>電話 *</label>
          <input name="phone" required inputmode="tel" autocomplete="tel">
        </div>

        <div class="ci-field">
          <label>會員身分 *</label>

          <div class="ci-types">
            <label class="ci-type">
              <input type="radio" name="memberType" value="general">
              <span>一般會員</span>
            </label>

            <label class="ci-type">
              <input type="radio" name="memberType" value="association">
              <span>協會會員</span>
            </label>

            <label class="ci-type">
              <input type="radio" name="memberType" value="vendor">
              <span>廠商會員</span>
            </label>
          </div>
        </div>

        <div class="ci-field" data-member-no-field hidden>
          <label>會員編號 *</label>
          <input name="memberNo" autocomplete="off">
          <div class="ci-note">
            協會會員、廠商會員會與 CRM 核對會員編號、姓名與電話。
          </div>
        </div>

        <div class="ci-field">
          <label>電子郵件</label>
          <input name="email" type="email" autocomplete="email">
        </div>

        <div data-form-message></div>

        <button class="ci-btn primary" type="submit">
          完成身分登錄
        </button>
      </form>
    `);

    const form = app.querySelector("[data-identity-form]");
    const memberNoField = app.querySelector("[data-member-no-field]");
    const memberNoInput = form?.elements.memberNo;

    form?.querySelectorAll('input[name="memberType"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          const type = form.elements.memberType.value;
          const requiresMemberNo =
            type === "association" || type === "vendor";

          memberNoField.hidden = !requiresMemberNo;
          memberNoInput.required = requiresMemberNo;

          if (!requiresMemberNo) {
            memberNoInput.value = "";
          }
        });
      });

    form?.addEventListener("submit", submitRegistration);
  }

  async function submitRegistration(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const message = form.querySelector("[data-form-message]");

    const memberType =
      form.elements.memberType.value;

    if (!memberType) {
      message.innerHTML =
        '<div class="ci-error">請選擇會員身分</div>';
      return;
    }

    const memberNo = clean(form.elements.memberNo.value);

    if (
      (memberType === "association" ||
       memberType === "vendor") &&
      !memberNo
    ) {
      message.innerHTML =
        '<div class="ci-error">請輸入會員編號</div>';
      return;
    }

    const payload = {
      lineUserId: lineProfile.lineUserId,
      lineDisplayName: lineProfile.lineDisplayName,
      pictureUrl: lineProfile.pictureUrl,
      name: clean(form.elements.name.value),
      phone: clean(form.elements.phone.value),
      email: clean(form.elements.email.value),
      memberType,
      memberNo
    };

    if (!payload.name || !payload.phone) {
      message.innerHTML =
        '<div class="ci-error">姓名與電話為必填</div>';
      return;
    }

    submit.disabled = true;
    message.innerHTML =
      '<div class="ci-loading">正在核對會員身分...</div>';

    try {
      const response = await fetch(
        `${api}/api/identity/register`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-line-user-id": lineProfile.lineUserId
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message || "身分登錄失敗"
        );
      }

      goHome();
    } catch (err) {
      message.innerHTML =
        `<div class="ci-error">${esc(err.message || "身分登錄失敗")}</div>`;
      submit.disabled = false;
    }
  }

  async function start() {
    loading("正在連接 LINE Login...");

    try {
      const profile = await ensureLiff();
      if (!profile) return;

      loading("正在確認會員身分...");

      const identity = await loadIdentity();

      if (identity) {
        goHome();
      } else {
        renderRegistration();
      }
    } catch (err) {
      console.error("[checkin-module]", err);
      error(err.message || "會員服務載入失敗");
    }
  }

  start();
})();
