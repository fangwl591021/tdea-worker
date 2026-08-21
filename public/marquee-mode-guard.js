(() => {
  if (window.__tdeaMarqueeModeGuardInstalled) return;
  window.__tdeaMarqueeModeGuardInstalled = true;

  const NativeURLSearchParams = window.URLSearchParams;
  const conflictKeys = [
    'register', 'query', 'checkin', 'redeem', 'redeemSession',
    'memberQr', 'calendar', 'motherRegister', 'mother_register',
  ];

  const decodeState = (value) => {
    let raw = String(value || '');
    for (let i = 0; i < 2; i += 1) {
      try {
        const next = decodeURIComponent(raw);
        if (next === raw) break;
        raw = next;
      } catch { break; }
    }
    return raw;
  };

  const hasMarquee = (raw) => {
    if (!raw) return false;
    const text = decodeState(raw);
    const query = text.startsWith('?') ? text.slice(1) : text.includes('?') ? text.split('?').slice(1).join('?') : text.replace(/^#/, '');
    try { return new NativeURLSearchParams(query).has('marquee'); }
    catch { return /(?:^|[?&#])marquee(?:=1)?(?:&|$)/.test(text); }
  };

  let forceMarquee = false;
  try {
    const direct = new NativeURLSearchParams(location.search);
    forceMarquee = direct.has('marquee') || hasMarquee(direct.get('liff.state')) || hasMarquee(location.hash);
  } catch {}
  if (!forceMarquee) return;

  class MarqueeSafeSearchParams extends NativeURLSearchParams {
    constructor(init) {
      super(init);
      this.__normalizeMarqueeMode();
    }

    __normalizeMarqueeMode() {
      if (!super.has('marquee')) return;
      conflictKeys.forEach((key) => super.delete(key));
    }

    set(name, value) {
      const key = String(name);
      if (key === 'marquee') {
        super.set(name, value);
        conflictKeys.forEach((conflict) => super.delete(conflict));
        return;
      }
      if (conflictKeys.includes(key) && super.has('marquee')) return;
      super.set(name, value);
    }

    append(name, value) {
      const key = String(name);
      if (key === 'marquee') {
        super.append(name, value);
        conflictKeys.forEach((conflict) => super.delete(conflict));
        return;
      }
      if (conflictKeys.includes(key) && super.has('marquee')) return;
      super.append(name, value);
    }
  }

  window.URLSearchParams = MarqueeSafeSearchParams;
  window.__tdeaForcedPublicMode = 'marquee';
})();
