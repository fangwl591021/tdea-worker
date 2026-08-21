(() => {
  if (window.__tdeaMarqueeUiFixInstalled) return;
  window.__tdeaMarqueeUiFixInstalled = true;

  const NativeURLSearchParams = window.URLSearchParams;
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
  const merged = (() => {
    const output = new NativeURLSearchParams(location.search);
    const state = output.get('liff.state');
    if (state) {
      const raw = decodeState(state);
      const query = raw.startsWith('?') ? raw.slice(1) : raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;
      try {
        new NativeURLSearchParams(query).forEach((value, key) => { if (!output.has(key)) output.set(key, value); });
      } catch {}
    }
    return output;
  })();

  if (!merged.has('marquee') && window.__tdeaForcedPublicMode !== 'marquee') return;
  const adOnly = merged.get('adOnly') === '1' || merged.get('tdeaSource') === 'tdea-design';

  const hidePointResult = () => {
    const result = document.querySelector('[data-marquee-result]');
    const button = document.querySelector('[data-marquee-action="points"]');
    if (result) {
      result.hidden = true;
      result.innerHTML = '';
    }
    if (button?.dataset.marqueeQueryLabel) button.textContent = button.dataset.marqueeQueryLabel;
  };

  const syncUi = () => {
    const result = document.querySelector('[data-marquee-result]');
    const pointsButton = document.querySelector('[data-marquee-action="points"]');
    const checkinButton = document.querySelector('[data-marquee-action="checkin"]');
    const buttonRow = document.querySelector('.nf-marquee-buttons');

    if (adOnly && checkinButton) {
      checkinButton.hidden = true;
      checkinButton.style.display = 'none';
      if (buttonRow) buttonRow.style.gridTemplateColumns = '1fr';
    }

    if (!result || !pointsButton) return;
    if (!pointsButton.dataset.marqueeQueryLabel) pointsButton.dataset.marqueeQueryLabel = pointsButton.textContent || '查詢點數';

    const visible = !result.hidden && Boolean(result.textContent?.trim());
    pointsButton.textContent = visible ? '關閉點數' : pointsButton.dataset.marqueeQueryLabel;

    if (visible && !result.querySelector('[data-close-marquee-points]')) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'nf-btn';
      close.dataset.closeMarqueePoints = '1';
      close.textContent = '關閉點數明細';
      close.style.marginTop = '12px';
      result.appendChild(close);
    }
  };

  document.addEventListener('click', (event) => {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return;

    if (node.closest('[data-close-marquee-points]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      hidePointResult();
      return;
    }

    const pointsButton = node.closest('[data-marquee-action="points"]');
    if (pointsButton) {
      const result = document.querySelector('[data-marquee-result]');
      if (result && !result.hidden && Boolean(result.textContent?.trim())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hidePointResult();
      }
      return;
    }

    if (node.closest('[data-marquee-image-id], [data-marquee-action="checkin"]')) hidePointResult();
  }, true);

  const observer = new MutationObserver(() => syncUi());
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('DOMContentLoaded', syncUi, { once: true });
  setTimeout(syncUi, 0);
})();
