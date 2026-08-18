(() => {
  const params = new URLSearchParams(location.search);
  const state = params.get('liff.state');
  if (state) {
    try { new URLSearchParams(decodeURIComponent(state).replace(/^\?/, '')).forEach((v,k) => { if (!params.has(k)) params.set(k,v); }); }
    catch (_) {}
  }
  const formId = params.get('register');
  if (!formId) return;
  const api = location.hostname.endsWith('github.io') ? 'https://tdeawork.fangwl591021.workers.dev' : '';
  let schema = null;
  let attachmentUrl = '';

  async function loadSchema() {
    if (schema) return schema;
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache:'no-store' });
      const result = await response.json().catch(() => ({}));
      schema = result?.data?.form || result?.data || {};
    } catch (_) { schema = {}; }
    return schema;
  }

  function isEnabled(form) {
    const fields = Array.isArray(form?.fields) ? form.fields : [];
    const settings = form?.settings || {};
    const activity = form?.activity || {};
    const flag = String(settings.requireImageUpload ?? activity.requireImageUpload ?? '').toUpperCase();
    const configured = flag === 'Y' || flag === 'TRUE' || flag === '1' || fields.some((f) => String(f?.key || '') === 'imageUpload' || String(f?.type || '') === 'file');
    if (configured) return true;

    // Emergency compatibility: the Tianjin activity was saved with the admin selector set to Y,
    // but older native-form snapshots did not persist requireImageUpload into settings/fields.
    // Scope the fallback only to Tianjin so other activities remain unchanged.
    const activityText = [activity.name, activity.title, activity.activityName, activity.detailText].filter(Boolean).join(' ');
    const pageText = String(document.querySelector('.nf-title')?.textContent || document.body?.innerText || '');
    return /天津/.test(activityText) || /天津/.test(pageText);
  }

  async function uploadFile(file, status, input) {
    attachmentUrl = '';
    if (!file) { status.textContent = '尚未選擇附件'; return; }
    if (file.size > 8 * 1024 * 1024) { status.textContent = '附件不可超過 8MB'; input.value = ''; return; }
    status.textContent = '附件上傳中…';
    input.disabled = true;
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('formId', formId);
      const response = await fetch(`${api}/api/registration-attachments`, { method:'POST', body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || '附件上傳失敗');
      attachmentUrl = result.url || '';
      status.textContent = `已上傳：${file.name}`;
    } catch (error) {
      attachmentUrl = '';
      status.textContent = error?.message || '附件上傳失敗';
      input.value = '';
    } finally {
      input.disabled = false;
    }
  }

  async function enhance() {
    const native = await loadSchema();
    if (!isEnabled(native)) return;
    const form = document.querySelector('form.nf-form, .nf-form form, form[data-native-form]');
    if (!form || form.dataset.attachmentFixReady === '1') return;
    form.dataset.attachmentFixReady = '1';

    let old = form.querySelector('[name="imageUpload"]');
    let host = old?.closest('.nf-field') || old?.parentElement || null;
    if (!host) {
      host = document.createElement('div');
      host.className = 'nf-field';
      const actions = form.querySelector('.nf-actions') || form.querySelector('button[type="submit"]')?.parentElement;
      if (actions) actions.insertAdjacentElement('beforebegin', host);
      else form.appendChild(host);
    }

    host.innerHTML = `
      <label>附件上傳</label>
      <input data-registration-attachment type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf">
      <input data-registration-attachment-url name="imageUpload" type="hidden">
      <small data-registration-attachment-status style="color:#667085">支援 JPG、PNG、WEBP、GIF、PDF，單檔上限 8MB。</small>`;

    const input = host.querySelector('[data-registration-attachment]');
    const hidden = host.querySelector('[data-registration-attachment-url]');
    const status = host.querySelector('[data-registration-attachment-status]');
    input.addEventListener('change', async () => {
      await uploadFile(input.files?.[0], status, input);
      hidden.value = attachmentUrl;
    });

    form.addEventListener('submit', (event) => {
      if (input.files?.length && !attachmentUrl) {
        event.preventDefault();
        event.stopImmediatePropagation();
        status.textContent = '附件尚未上傳完成，請稍候。';
      }
    }, true);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (resource, options = {}) => {
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      const method = String(options?.method || (typeof resource !== 'string' ? resource?.method : '') || 'GET').toUpperCase();
      if (attachmentUrl && method === 'POST' && url.includes(`/api/native-forms/${encodeURIComponent(formId)}`) && options?.body && typeof options.body === 'string') {
        const payload = JSON.parse(options.body);
        if (payload && typeof payload === 'object') {
          payload.answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
          payload.answers.imageUpload = attachmentUrl;
          options = { ...options, body: JSON.stringify(payload) };
        }
      }
    } catch (_) {}
    return originalFetch(resource, options);
  };

  new MutationObserver(() => { enhance(); }).observe(document.documentElement, { childList:true, subtree:true });
  enhance();
})();