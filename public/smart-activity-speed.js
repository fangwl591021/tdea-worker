(() => {
  const originalFetch = window.fetch.bind(window);
  const TARGET = '/api/smart-activities/analyze';

  async function compressPoster(dataUrl) {
    if (!dataUrl || !/^data:image\//i.test(dataUrl)) return dataUrl;
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      if (scale >= 0.999 && dataUrl.length < 1_500_000) return dataUrl;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch (_) {
      return dataUrl;
    }
  }

  window.fetch = async (resource, options = {}) => {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    if (!url.includes(TARGET)) return originalFetch(resource, options);

    let nextOptions = { ...options };
    try {
      if (typeof nextOptions.body === 'string') {
        const payload = JSON.parse(nextOptions.body);
        if (payload?.posterDataUrl) {
          const before = payload.posterDataUrl.length;
          payload.posterDataUrl = await compressPoster(payload.posterDataUrl);
          const after = payload.posterDataUrl.length;
          nextOptions.body = JSON.stringify(payload);
          window.__tdeaSmartActivityPayload = { before, after };
        }
      }
    } catch (_) {}

    if (!nextOptions.signal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort('AI 分析逾時'), 28000);
      nextOptions.signal = controller.signal;
      try {
        return await originalFetch(resource, nextOptions);
      } finally {
        clearTimeout(timer);
      }
    }
    return originalFetch(resource, nextOptions);
  };
})();