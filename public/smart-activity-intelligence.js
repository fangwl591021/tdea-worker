(() => {
  const originalFetch = window.fetch.bind(window);
  let latest = null;

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }

  function unitLabel(unit) {
    return ({person:'人',room:'房/間',item:'份/件',ticket:'張',group:'組',fixed:'固定',rod:'桿',table:'桌',meal:'餐',day:'日'})[unit] || unit || '單位';
  }

  function typeLabel(type) {
    return ({text:'文字',email:'Email',number:'數字',radio:'單選',checkbox:'複選',dropdown:'下拉',paragraph:'段落',attachment:'附件',payment:'付款',quantity:'數量'})[type] || type || '文字';
  }

  function renderPanel() {
    if (!latest) return;
    const root = document.querySelector('[data-smart-activity-root]');
    const panel = root?.querySelector('.smart-builder-panel');
    if (!panel) return;
    let box = panel.querySelector('[data-smart-intelligence-panel]');
    if (!box) {
      box = document.createElement('section');
      box.className = 'smart-builder-section';
      box.dataset.smartIntelligencePanel = '1';
      panel.appendChild(box);
    }

    const pricing = Array.isArray(latest.pricing) ? latest.pricing : [];
    const quantities = Array.isArray(latest.quantityFields) ? latest.quantityFields : [];
    const fields = Array.isArray(latest.registrationFieldSpecs) ? latest.registrationFieldSpecs : [];
    const agenda = Array.isArray(latest.agenda) ? latest.agenda : [];
    const rules = Array.isArray(latest.activityRules) ? latest.activityRules : [];
    const onsite = Array.isArray(latest.optionalOnsiteItems) ? latest.optionalOnsiteItems : [];

    box.innerHTML = `
      <label class="smart-builder-label">4. AI 規則解析</label>
      <div style="display:grid;gap:10px;font-size:13px">
        <div><strong>活動類型：</strong>${esc(latest.activityType || latest.category || '一般活動')}</div>
        ${latest.deadline ? `<div><strong>截止：</strong>${esc(latest.deadline)}</div>` : ''}
        ${quantities.length ? `<div><strong>獨立數量：</strong>${quantities.map(q => `${esc(q.label)}（${esc(q.key)}）`).join('、')}</div>` : ''}
        ${pricing.length ? `<div><strong>計價公式：</strong><div style="margin-top:6px;display:grid;gap:4px">${pricing.map(p => `<span>• ${esc(p.name)}：$${Number(p.amount||0).toLocaleString('zh-TW')} × ${esc(p.quantityKey || unitLabel(p.unit))} ${p.paymentTiming === 'onsite' ? '（現場）' : ''}</span>`).join('')}</div></div>` : ''}
        ${onsite.length ? `<div><strong>現場/選配：</strong>${onsite.map(p => `${esc(p.name)} $${Number(p.amount||0).toLocaleString('zh-TW')}/${esc(unitLabel(p.unit))}`).join('、')}</div>` : ''}
        ${fields.length ? `<div><strong>自動報名欄位：</strong><div style="margin-top:6px;display:grid;gap:4px">${fields.map(f => `<span>• ${esc(f.label)}｜${esc(typeLabel(f.type))}${f.quantityKey ? `｜${esc(f.quantityKey)}` : ''}${f.required ? '｜必填' : ''}</span>`).join('')}</div></div>` : ''}
        ${agenda.length ? `<div><strong>行程節點：</strong>${agenda.length} 個</div>` : ''}
        ${rules.length ? `<details><summary style="cursor:pointer;font-weight:700">活動規則 ${rules.length} 項</summary><div style="margin-top:6px;display:grid;gap:4px">${rules.map(r => `<span>• ${esc(r)}</span>`).join('')}</div></details>` : ''}
      </div>
      <small style="display:block;margin-top:8px;color:#667085">人、房、桿、餐、桌、張等數量會分開建模，不再共用單一人數。</small>`;
  }

  window.fetch = async (resource, options = {}) => {
    const response = await originalFetch(resource, options);
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      if (url.includes('/api/smart-activities/analyze') && response.ok) {
        const clone = response.clone();
        const payload = await clone.json().catch(() => null);
        if (payload?.success && payload?.data) {
          latest = payload.data;
          setTimeout(renderPanel, 0);
          setTimeout(renderPanel, 250);
        }
      }
    } catch (_) {}
    return response;
  };

  new MutationObserver(() => {
    if (latest) renderPanel();
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
