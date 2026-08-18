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
  let enabled = null;

  async function attachmentEnabled() {
    if (enabled !== null) return enabled;
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache:'no-store' });
      const result = await response.json().catch(() => ({}));
      const form = result?.data?.form || result?.data || {};
      enabled = Array.isArray(form.fields) && form.fields.some((f) => String(f?.key || '') === 'imageUpload' || String(f?.type || '') === 'file');
    } catch (_) { enabled = false; }
    return enabled;
  }

  async function enhance() {
    if (!await attachmentEnabled()) return;
    const form = document.querySelector('form.nf-form, .nf-form form, form[data-native-form]');
    if (!form || form.dataset.attachmentFixReady === '1') return;

    let old = form.querySelector('[name="imageUpload"]');
    if (!old) return;
    const host = old.closest('.nf-field') || old.parentElement;
    if (!host) return;
    form.dataset.attachmentFixReady = '1';

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'imageUpload';
    hidden.value = old.value || '';

    host.innerHTML = `
      <label>附件上傳</label>
      <input data-registration-attachment type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf">
      <small data-registration-attachment-status style="color:#667085">支援 JPG、PNG、WEBP、GIF、PDF，單檔上限 8MB。</small>`;
    host.appendChild(hidden);

    const input = host.querySelector('[data-registration-attachment]');
    const status = host.querySelector('[data-registration-attachment-status]');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      hidden.value = '';
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
        hidden.value = result.url || '';
        status.textContent = `已上傳：${file.name}`;
      } catch (error) {
        hidden.value = '';
        status.textContent = error?.message || '附件上傳失敗';
        input.value = '';
      } finally {
        input.disabled = false;
      }
    });

    form.addEventListener('submit', (event) => {
      if (input.files?.length && !hidden.value) {
        event.preventDefault();
        event.stopImmediatePropagation();
        status.textContent = '附件尚未上傳完成，請稍候。';
      }
    }, true);
  }

  new MutationObserver(() => { enhance(); }).observe(document.documentElement, { childList:true, subtree:true });
  enhance();
})();
