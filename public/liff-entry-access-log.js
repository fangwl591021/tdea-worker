(() => {
  const LIFF_ID = "2005868456-3Ip8H1Bx";
  const API = location.hostname.endsWith("github.io")
    ? "https://tdeawork.fangwl591021.workers.dev"
    : "";

  // Only run inside LINE / LIFF browser.
  if (!/Line/i.test(navigator.userAgent || "")) return;

  const params = new URLSearchParams(location.search);

  const state = params.get("liff.state");
  if (state) {
    try {
      new URLSearchParams(
        decodeURIComponent(state).replace(/^\?/, "")
      ).forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    } catch (_) {}
  }

  // Other TDEA LIFF pages have their own LIFF IDs.
  // Do not initialize 3Ip8H1Bx on those pages.
  const excludedKeys = [
    "adminLogin",
    "cardCollection",
    "register",
    "query",
    "memberQr",
    "calendar",
    "checkin",
    "redeem",
    "redeemSession",
    "monthlyDetail",
    "monthlyShare",
    "personalMessages",
    "close",
    "marquee",
    "motherRegister",
    "memberHome",
    "checkinModule"
  ];

  if (excludedKeys.some(key => params.has(key))) return;

  function loadLiffSdk() {
    if (window.liff) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-member-entry-liff-sdk]");

      if (existing) {
        existing.addEventListener("load", resolve, { once:true });
        existing.addEventListener("error", reject, { once:true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.async = true;
      script.dataset.memberEntryLiffSdk = "1";
      script.onload = resolve;
      script.onerror = () => reject(new Error("LIFF SDK load failed"));
      document.head.appendChild(script);
    });
  }

  async function writeAccessLog() {
    try {
      await loadLiffSdk();
      await window.liff.init({ liffId: LIFF_ID });

      // Opening this LIFF from LINE should normally already be logged in.
      // Do not force a redirect if it is not.
      if (!window.liff.isLoggedIn()) return;

      const idToken = window.liff.getIDToken?.();

      if (!idToken) return;

      const response = await fetch(API + "/api/liff-entry-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idToken,
          liffId: LIFF_ID,
          href: location.href,
          userAgent: navigator.userAgent,
          source: "liff-member-entry"
        }),
        keepalive: true
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success && result.data?.lineUserId) {
        try {
          sessionStorage.setItem(
            "tdea-member-entry-line-user-id",
            result.data.lineUserId
          );
        } catch (_) {}
      }
    } catch (error) {
      console.warn("TDEA LIFF entry logging failed", error);
    }
  }

  writeAccessLog();
})();