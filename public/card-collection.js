(() => {
  if (!document.querySelector('link[data-card-collection-style]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.dataset.cardCollectionStyle = "1";
    style.href = new URL(
      "card-collection.css?v=card2",
      document.currentScript?.src || location.href
    ).href;
    document.head.appendChild(style);
  }
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const liffId = "2005868456-2jmxqyFU";
  const app = document.getElementById("app");

  const state = {
    lineUserId: "",
    displayName: "",
    image: null,
    rotation: 0,
    zoom: 1,
    cards: [],
    cropQuad: null,
    dragHandle: -1,
    dragPointerId: null,
    displayRect: null
  };

  const clean = value => String(value ?? "").trim();

  function normalizeWebsite(value) {
    const text = clean(value);
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (/^www\./i.test(text)) return `https://${text}`;
    if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(text)) {
      return `https://${text}`;
    }
    return text;
  }

  const esc = value => clean(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[ch] || ch));

  function queryParams() {
    const result = new URLSearchParams(location.search);
    const liffState = result.get("liff.state");

    if (liffState) {
      try {
        new URLSearchParams(
          decodeURIComponent(liffState).replace(/^\?/, "")
        ).forEach((value, key) => {
          if (!result.has(key)) result.set(key, value);
        });
      } catch (_) {}
    }

    return result;
  }

  function requestHeaders(hasBody = false) {
    return {
      "x-line-user-id": state.lineUserId,
      ...(hasBody
        ? { "content-type": "application/json; charset=utf-8" }
        : {})
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(api + path, {
      cache: "no-store",
      ...options,
      headers: {
        ...requestHeaders(Boolean(options.body)),
        ...(options.headers || {})
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "操作失敗");
    }

    return result;
  }

  function showStatus(message, type = "info") {
    const node = document.querySelector("[data-cc-status]");
    if (!node) return;

    node.textContent = message;
    node.className = `cc-status show ${type}`;
  }

  function clearStatus() {
    const node = document.querySelector("[data-cc-status]");
    if (node) node.className = "cc-status";
  }

  function loadLiffSdk() {
    if (window.liff) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.onload = resolve;
      script.onerror = () => reject(
        new Error("LINE LIFF SDK 載入失敗")
      );
      document.head.appendChild(script);
    });
  }

  async function resolveIdentity() {
    const params = queryParams();
    const testUid = clean(
      params.get("uid") ||
      params.get("lineUserId") ||
      params.get("lineUid")
    );

    if (testUid) {
      state.lineUserId = testUid;
      state.displayName = "測試模式";
      return;
    }

    await loadLiffSdk();
    await window.liff.init({ liffId });

    if (!window.liff.isLoggedIn()) {
      window.liff.login({ redirectUri: location.href });
      throw new Error("正在開啟 LINE 登入");
    }

    const profile = await window.liff.getProfile();
    state.lineUserId = clean(profile.userId);
    state.displayName = clean(profile.displayName);

    if (!state.lineUserId) {
      throw new Error("無法取得 LINE 使用者身份");
    }
  }

  function field(name, label, type = "text", required = false) {
    return `
      <div class="cc-field">
        <label for="cc-${name}">
          ${esc(label)}${required ? "＊" : ""}
        </label>
        <input
          id="cc-${name}"
          name="${name}"
          type="${type}"
          ${required ? "required" : ""}
        >
      </div>
    `;
  }

  function renderShell() {
    app.innerHTML = `
      <main class="cc-shell">
        <header class="cc-header">
          <div>
            <h1>名片收藏</h1>
            <p>拍照辨識後，請確認內容再收藏。</p>
          </div>
          <div class="cc-user">${esc(state.displayName)}</div>
        </header>

        <div class="cc-status" data-cc-status></div>

        <section class="cc-card">
          <h2>新增名片</h2>

          <div class="cc-actions cc-source-actions">
            <label class="cc-button primary cc-file-button">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                data-card-file
              >
              📷 拍照
            </label>

            <label class="cc-button secondary cc-file-button">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-card-file
              >
              🖼️ 上傳圖片
            </label>
          </div>

          <p class="cc-upload-hint">
            選擇圖片後會顯示名片裁切器。
          </p>

          <div class="cc-stage" data-card-stage>
            <div class="cc-crop">
              <canvas
                width="1200"
                height="720"
                data-card-canvas
              ></canvas>
              <canvas
                width="1200"
                height="720"
                data-card-overlay
              ></canvas>
            </div>
            <div class="cc-crop-hint">
              請拖曳四個角點，框住名片四邊。
            </div>

            <div class="cc-controls">
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value="1"
                data-card-zoom
              >
              <button
                class="cc-button secondary"
                type="button"
                data-card-rotate
              >旋轉 90°</button>
            </div>

            <div class="cc-actions">
              <button
                class="cc-button secondary"
                type="button"
                data-card-reset
              >重新選圖</button>

              <button
                class="cc-button primary"
                type="button"
                data-card-ocr
              >AI 辨識名片</button>
            </div>
          </div>
        </section>

        <section class="cc-card" data-form-section hidden>
          <h2>確認名片資料</h2>

          <form class="cc-form" data-card-form>
            ${field("displayName", "姓名", "text", true)}
            ${field("companyName", "公司／單位")}
            ${field("jobTitle", "職稱")}
            ${field("mobile", "電話")}
            ${field("email", "Email", "email")}
            ${field("websiteUrl", "網站", "url")}
            ${field("address", "地址")}

            <div class="cc-field">
              <label for="cc-note">備註</label>
              <textarea id="cc-note" name="note"></textarea>
            </div>

            <div class="cc-form-actions">
              <button
                class="cc-button secondary"
                type="button"
                data-card-cancel
              >取消</button>

              <button
                class="cc-button primary"
                type="submit"
              >確認收藏</button>
            </div>
          </form>
        </section>

        <section class="cc-card">
          <h2>我的名片收藏</h2>
          <div class="cc-list" data-card-list>
            <div class="cc-empty">載入中…</div>
          </div>
        </section>
      </main>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll("[data-card-file]")
      .forEach(input => {
        input.addEventListener("change", handleFile);
      });

    document.querySelector("[data-card-zoom]")
      ?.addEventListener("input", event => {
        state.zoom = Number(event.target.value || 1);
        drawCanvas();
      });

    document.querySelector("[data-card-rotate]")
      ?.addEventListener("click", () => {
        state.rotation = (state.rotation + 90) % 360;
        drawCanvas();
      });

    document.querySelector("[data-card-reset]")
      ?.addEventListener("click", resetUploader);

    document.querySelector("[data-card-ocr]")
      ?.addEventListener("click", runOcr);

    document.querySelector("[data-card-cancel]")
      ?.addEventListener("click", resetForm);

    document.querySelector("[data-card-form]")
      ?.addEventListener("submit", saveCard);

    document.querySelector('input[name="websiteUrl"]')
      ?.addEventListener("blur", event => {
        event.target.value = normalizeWebsite(event.target.value);
      });

    document.querySelector("[data-card-list]")
      ?.addEventListener("click", handleListClick);
  }

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      showStatus("只接受 JPG、PNG 或 WebP 圖片。", "error");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      showStatus("圖片超過 12MB，請改用較小的照片。", "error");
      return;
    }

    state.rotation = 0;
    state.zoom = 1;

    const image = new Image();

    image.onload = () => {
      state.image = image;

      document
        .querySelector("[data-card-stage]")
        ?.classList.add("active");

      const slider = document.querySelector("[data-card-zoom]");
      if (slider) slider.value = "1";

      drawCanvas();
      clearStatus();
      URL.revokeObjectURL(image.src);
    };

    image.onerror = () => {
      showStatus("圖片讀取失敗。", "error");
    };

    image.src = URL.createObjectURL(file);
  }

  function drawCanvas() {
    const canvas = document.querySelector("[data-card-canvas]");
    const image = state.image;

    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#101828";
    ctx.fillRect(0, 0, width, height);

    const radians = state.rotation * Math.PI / 180;
    const rotated = state.rotation % 180 !== 0;

    const virtualWidth = rotated ? image.height : image.width;
    const virtualHeight = rotated ? image.width : image.height;

    const scale = Math.max(
      width / virtualWidth,
      height / virtualHeight
    ) * state.zoom;

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(radians);
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  }

  function croppedImage() {
    const canvas = document.querySelector("[data-card-canvas]");

    if (!canvas || !state.image) {
      throw new Error("請先選擇名片圖片");
    }

    const output = document.createElement("canvas");
    output.width = 1400;
    output.height = 840;

    output.getContext("2d").drawImage(
      canvas,
      0,
      0,
      output.width,
      output.height
    );

    return output.toDataURL("image/jpeg", 0.84);
  }

  async function runOcr() {
    const button = document.querySelector("[data-card-ocr]");
    button.disabled = true;
    button.textContent = "辨識中…";

    showStatus("AI 正在辨識名片，請稍候。", "info");

    try {
      const result = await request("/api/card-collection/ocr", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: croppedImage()
        })
      });

      fillForm(result.data || {});

      const websiteInput = document.querySelector('input[name="websiteUrl"]');
      if (websiteInput) {
        const rawWebsite = String(result.data?.websiteUrl || "").trim();
        websiteInput.value = rawWebsite && !/^https?:\/\//i.test(rawWebsite)
          ? `https://${rawWebsite.replace(/^\/+/, "")}`
          : rawWebsite;
      }

      const section = document.querySelector("[data-form-section]");
      section.hidden = false;

      showStatus(
        "辨識完成，請檢查姓名、電話與 Email。",
        "ok"
      );
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "AI 辨識名片";
    }
  }

  function fillForm(data) {
    const form = document.querySelector("[data-card-form]");
    if (!form) return;

    const values = {
      displayName: clean(data.displayName),
      companyName: clean(data.companyName),
      jobTitle: clean(data.jobTitle),
      mobile: clean(data.mobile),
      email: clean(data.email),
      websiteUrl: normalizeWebsite(data.websiteUrl),
      address: clean(data.address),
      note: clean(data.note)
    };

    Object.entries(values).forEach(([name, value]) => {
      const input = form.elements.namedItem(name);
      if (input) input.value = value;
    });
  }

  async function saveCard(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');

    submit.disabled = true;
    submit.textContent = "收藏中…";

    try {
      const rawPayload = Object.fromEntries(
        new FormData(form).entries()
      );

      const payload = {
        ...rawPayload,
        websiteUrl: normalizeWebsite(rawPayload.websiteUrl),
        lineUrl: ""
      };

      const websiteField = form.elements.namedItem("websiteUrl");
      if (websiteField) {
        const rawWebsite = String(websiteField.value || "").trim();
        websiteField.value = rawWebsite && !/^https?:\/\//i.test(rawWebsite)
          ? `https://${rawWebsite.replace(/^\/+/, "")}`
          : rawWebsite;
      }

      const result = await request(
        "/api/card-collection/cards",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      showStatus(
        result.duplicate
          ? "這張名片已收藏過，不會重複新增或贈點。"
          : "名片已收藏。",
        result.duplicate ? "info" : "ok"
      );

      resetForm();
      resetUploader();
      await loadCards();
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "確認收藏";
    }
  }

  function resetUploader() {
    state.image = null;
    state.rotation = 0;
    state.zoom = 1;

    document.querySelectorAll("[data-card-file]")
      .forEach(file => {
        file.value = "";
      });

    document
      .querySelector("[data-card-stage]")
      ?.classList.remove("active");
  }

  function resetForm() {
    document.querySelector("[data-card-form]")?.reset();

    const section = document.querySelector("[data-form-section]");
    if (section) section.hidden = true;
  }

  async function loadCards() {
    const list = document.querySelector("[data-card-list]");

    try {
      const result = await request("/api/card-collection/cards");
      state.cards = Array.isArray(result.data) ? result.data : [];
      renderCards(list);
    } catch (error) {
      list.innerHTML = `
        <div class="cc-empty">${esc(error.message)}</div>
      `;
    }
  }

  function renderCards(list) {
    if (!state.cards.length) {
      list.innerHTML = `
        <div class="cc-empty">目前還沒有收藏名片。</div>
      `;
      return;
    }

    list.innerHTML = state.cards.map(card => `
      <article class="cc-item">
        <div class="cc-item-head">
          <div>
            <h3>${esc(card.displayName || "未命名")}</h3>
            <div class="cc-company">
              ${esc(card.companyName || "")}
              ${card.jobTitle
                ? `・${esc(card.jobTitle)}`
                : ""}
            </div>
          </div>
        </div>

        <div class="cc-meta">
          ${card.mobile
            ? `<div>電話：${esc(card.mobile)}</div>`
            : ""}
          ${card.email
            ? `<div>Email：${esc(card.email)}</div>`
            : ""}
          ${card.address
            ? `<div>地址：${esc(card.address)}</div>`
            : ""}
        </div>

        <span class="cc-reward">
          ${card.rewardStatus === "completed"
            ? `已贈 ${Number(card.rewardPoints || 0)} 點`
            : card.rewardStatus === "failed"
              ? "贈點失敗"
              : "未贈點"}
        </span>

        <div class="cc-item-actions">
          <button
            class="cc-button danger"
            type="button"
            data-card-delete="${esc(card.id)}"
          >刪除</button>
        </div>
      </article>
    `).join("");
  }

  async function handleListClick(event) {
    const button = event.target.closest("[data-card-delete]");
    if (!button) return;

    const cardId = clean(button.dataset.cardDelete);

    if (
      !cardId ||
      !confirm("確定要刪除這張收藏名片嗎？")
    ) {
      return;
    }

    button.disabled = true;

    try {
      await request(
        `/api/card-collection/cards/${encodeURIComponent(cardId)}`,
        { method: "DELETE" }
      );

      showStatus("名片已刪除。", "ok");
      await loadCards();
    } catch (error) {
      showStatus(error.message, "error");
      button.disabled = false;
    }
  }

  async function start() {
    try {
      await resolveIdentity();

      const settingsResult = await request(
        "/api/card-collection/settings"
      );

      if (settingsResult.data?.collectionEnabled === false) {
        app.innerHTML = `
          <main class="cc-shell">
            <section class="cc-card cc-blocked">
              <h2>名片收藏目前未開放</h2>
              <p>請稍後再向協會確認。</p>
            </section>
          </main>
        `;
        return;
      }

      renderShell();
      await loadCards();
    } catch (error) {
      app.innerHTML = `
        <main class="cc-shell">
          <section class="cc-card cc-blocked">
            <h2>無法開啟名片收藏</h2>
            <p>${esc(error.message)}</p>
          </section>
        </main>
      `;
    }
  }

  start();
})();










