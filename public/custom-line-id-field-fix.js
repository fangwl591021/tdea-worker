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
  let customLineField = null;
  let currentValue = '';

  const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, '');
  const isPermanentCustomKey = (key) => /^fld[_-]/i.test(String(key || '')) || /^custom_/i.test(String(key || ''));
  const isLineIdLabel = (label) => ['lineid', 'line帳號', 'line帳號id', 'lineuserid'].includes(normalize(label));

  async function loadField() {
    if (customLineField) return customLineField;
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      const native = result?.data?.form || result?.data || {};
      const fields = Array.isArray(native.fields) ? native.fields : [];
      customLineField = fields.find((field) => field && isPermanentCustomKey(field.key) && isLineIdLabel(field.label)) || null;
    } catch (_) {
      customLineField = null;
    }
    return customLineField;
  }

  function insertAtSchemaPosition(form, host, field) {
    const allFields = window.__tdeaLineIdSchemaFields || [];
    const index = allFields.findIndex((item) => String(item?.key || '') === String(field.key || ''));
    if (index > 0) {
      for (let i = index - 1; i >= 0; i -= 1) {
        const previousKey = String(allFields[i]?.key || '').trim();
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
    const field = await loadField();
    if (!field) return;
    const form = document.querySelector('form.nf-form, .nf-form form, form[data-native-form]');
    if (!form) return;

    const existing = form.querySelector(`[name="${CSS.escape(String(field.key))}"]`);
    if (existing && existing.type !== 'hidden') return;
    if (form.querySelector('[data-custom-line-id-fix="1"]')) return;

    const host = document.createElement('div');
    host.className = 'nf-field';
    host.dataset.customLineIdFix = '1';
    host.innerHTML = `
      <label>${String(field.label || 'LINE ID').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}${field.required ? ' <span class="nf-required">*</span>' : ''}</label>
      <input data-custom-line-id-input name="${String(field.key).replace(/"/g, '&quot;')}" type="text" autocomplete="off" ${field.required ? 'required' : ''}>
    `;
    const input = host.querySelector('[data-custom-line-id-input]');
    input.value = currentValue;
    input.addEventListener('input', () => { currentValue = input.value; });
    insertAtSchemaPosition(form, host, field);
  }

  async function primeSchema() {
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      const native = result?.data?.form || result?.data || {};
      window.__tdeaLineIdSchemaFields = Array.isArray(native.fields) ? native.fields : [];
      customLineField = window.__tdeaLineIdSchemaFields.find((field) => field && isPermanentCustomKey(field.key) && isLineIdLabel(field.label)) || null;
    } catch (_) {}
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (resource, options = {}) => {
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      const method = String(options?.method || (typeof resource !== 'string' ? resource?.method : '') || 'GET').toUpperCase();
      if (customLineField && method === 'POST' && url.includes(`/api/native-forms/${encodeURIComponent(formId)}`) && options?.body && typeof options.body === 'string') {
        const payload = JSON.parse(options.body);
        if (payload && typeof payload === 'object') {
          payload.answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
          payload.answers[customLineField.key] = currentValue;
          options = { ...options, body: JSON.stringify(payload) };
        }
      }
    } catch (_) {}
    return originalFetch(resource, options);
  };

  primeSchema().then(ensureVisible);
  new MutationObserver(() => { ensureVisible(); }).observe(document.documentElement, { childList: true, subtree: true });
})();