(() => {
  const params = new URLSearchParams(location.search);
  const state = params.get('liff.state');
  if (state) {
    try {
      new URLSearchParams(decodeURIComponent(state).replace(/^\?/, '')).forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    } catch (_) {}
  }

  const formId = params.get('register');
  if (!formId) return;

  const api = location.hostname.endsWith('github.io') ? 'https://tdeawork.fangwl591021.workers.dev' : '';
  let targetField = null;
  let currentValue = '';
  let schemaFields = [];

  const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, '');
  const isIdCardLabel = (label) => {
    const text = normalize(label);
    return ['身分證字號', '身份證字號', '身分證號', '身份證號', '身分證號碼', '身份證號碼'].includes(text);
  };

  async function loadSchema() {
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      const native = result?.data?.form || result?.data || {};
      schemaFields = Array.isArray(native.fields) ? native.fields : [];
      targetField = schemaFields.find((field) => field && isIdCardLabel(field.label)) || null;
    } catch (_) {
      targetField = null;
      schemaFields = [];
    }
    return targetField;
  }

  function insertAtSchemaPosition(form, host, field) {
    const index = schemaFields.findIndex((item) => String(item?.key || '') === String(field.key || ''));
    if (index > 0) {
      for (let i = index - 1; i >= 0; i -= 1) {
        const previousKey = String(schemaFields[i]?.key || '').trim();
        if (!previousKey) continue;
        const previous = form.querySelector(`[name="${CSS.escape(previousKey)}"]`);
        const previousHost = previous?.closest('.nf-field');
        if (previousHost) {
          previousHost.insertAdjacentElement('afterend', host);
          return;
        }
      }
    }
    const actions = form.querySelector('.nf-actions') || form.querySelector('button[type="submit"]')?.parentElement;
    if (actions) actions.insertAdjacentElement('beforebegin', host);
    else form.appendChild(host);
  }

  async function ensureVisible() {
    const field = targetField || await loadSchema();
    if (!field?.key) return;

    const form = document.querySelector('form[data-native-register], form.nf-form, .nf-form form, form[data-native-form]');
    if (!form) return;

    const existing = form.querySelector(`[name="${CSS.escape(String(field.key))}"]`);
    if (existing && existing.type !== 'hidden') {
      currentValue = existing.value || currentValue;
      return;
    }
    if (form.querySelector('[data-custom-id-card-fix="1"]')) return;

    const host = document.createElement('div');
    host.className = 'nf-field';
    host.dataset.customIdCardFix = '1';
    const safeLabel = String(field.label || '身分證字號').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    const safeName = String(field.key).replace(/"/g, '&quot;');
    host.innerHTML = `
      <label>${safeLabel}${field.required ? ' <span class="nf-required">*</span>' : ''}</label>
      <input data-custom-id-card-input name="${safeName}" type="text" autocomplete="off" ${field.required ? 'required' : ''}>
    `;
    const input = host.querySelector('[data-custom-id-card-input]');
    input.value = currentValue;
    input.addEventListener('input', () => { currentValue = input.value; });
    insertAtSchemaPosition(form, host, field);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (resource, options = {}) => {
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      const method = String(options?.method || (typeof resource !== 'string' ? resource?.method : '') || 'GET').toUpperCase();
      if (targetField && method === 'POST' && url.includes(`/api/native-forms/${encodeURIComponent(formId)}`) && options?.body && typeof options.body === 'string') {
        const payload = JSON.parse(options.body);
        if (payload && typeof payload === 'object') {
          payload.answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
          payload.answers[targetField.key] = currentValue;
          options = { ...options, body: JSON.stringify(payload) };
        }
      }
    } catch (_) {}
    return originalFetch(resource, options);
  };

  loadSchema().then(ensureVisible);
  new MutationObserver(() => { ensureVisible(); }).observe(document.documentElement, { childList: true, subtree: true });
})();