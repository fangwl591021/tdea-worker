(() => {
  const originalFetch = window.fetch.bind(window);
  let lastOcrText = "";

  function ensureBox() {
    const root = document.querySelector('[data-smart-activity-root] .smart-builder-panel');
    if (!root) return null;
    let box = root.querySelector('[data-smart-ocr-progress]');
    if (box) return box;
    const aiSection = root.querySelector('.smart-ai-section');
    if (!aiSection) return null;
    box = document.createElement('div');
    box.dataset.smartOcrProgress = '1';
    box.style.cssText = 'display:none;gap:8px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1e3a8a;font-size:12px;line-height:1.6;';
    box.innerHTML = '<strong data-smart-ocr-title>第一階段：圖片文字辨識</strong><textarea data-smart-ocr-text readonly style="width:100%;min-height:160px;box-sizing:border-box;border:1px solid #bfdbfe;border-radius:10px;background:#fff;padding:10px;font:inherit;line-height:1.6;resize:vertical"></textarea><div data-smart-ocr-status>等待辨識</div>';
    aiSection.insertAdjacentElement('beforebegin', box);
    return box;
  }

  function showOcr(status, text = '') {
    const box = ensureBox();
    if (!box) return;
    box.style.display = 'grid';
    const statusNode = box.querySelector('[data-smart-ocr-status]');
    const textNode = box.querySelector('[data-smart-ocr-text]');
    if (statusNode) statusNode.textContent = status;
    if (textNode && text && textNode.value !== text) textNode.value = text;
  }

  window.fetch = async (resource, options = {}) => {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const method = String(options?.method || (typeof resource !== 'string' ? resource?.method : '') || 'GET').toUpperCase();
    if (!(method === 'POST' && url.includes('/api/smart-activities/analyze') && typeof options?.body === 'string')) {
      return originalFetch(resource, options);
    }

    let payload;
    try { payload = JSON.parse(options.body); } catch (_) { return originalFetch(resource, options); }
    if (!payload?.posterDataUrl) return originalFetch(resource, options);

    showOcr('圖片文字辨識中…');
    const ocrResponse = await originalFetch('/api/smart-activities/ocr', {
      method: 'POST',
      headers: options.headers || { 'content-type': 'application/json' },
      body: JSON.stringify({ posterDataUrl: payload.posterDataUrl })
    });
    const ocrResult = await ocrResponse.json().catch(() => ({}));
    if (!ocrResponse.ok || ocrResult.success !== true || !ocrResult.ocrText) {
      const message = ocrResult.message || `圖片文字辨識失敗 HTTP ${ocrResponse.status}`;
      showOcr(message);
      return new Response(JSON.stringify({ success:false, message }), { status: 500, headers: { 'content-type':'application/json' } });
    }

    lastOcrText = String(ocrResult.ocrText || '');
    showOcr('第一階段完成。正在把辨識文字轉成報名欄位…', lastOcrText);

    const originalText = String(payload.text || '').trim();
    const nextPayload = {
      ...payload,
      posterDataUrl: '',
      text: `${originalText}\n\n【海報 OCR 文字】\n${lastOcrText}`.trim()
    };
    const finalResponse = await originalFetch(resource, { ...options, body: JSON.stringify(nextPayload) });
    if (finalResponse.ok) {
      showOcr('第一階段完成；第二階段報名欄位已生成。', lastOcrText);
      setTimeout(() => showOcr('第一階段完成；第二階段報名欄位已生成。', lastOcrText), 350);
    }
    return finalResponse;
  };
})();