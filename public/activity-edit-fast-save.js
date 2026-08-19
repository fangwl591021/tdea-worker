(() => {
  const api = location.hostname.endsWith('github.io') ? 'https://tdeawork.fangwl591021.workers.dev' : '';

  function storedValue(...keys) {
    for (const key of keys) {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
      if (String(value).trim()) return String(value).trim();
    }
    return '';
  }

  function adminHeaders(extra = {}) {
    const headers = { ...extra };
    const email = storedValue('tdea-admin-email');
    const memberNo = storedValue('tdea-admin-member-no', 'tdea-member-no');
    const lineUserId = storedValue('tdea-admin-line-user-id', 'tdea-line-user-id', 'lineUserId');
    if (email) headers['x-admin-email'] = email;
    if (memberNo) headers['x-admin-member-no'] = memberNo;
    if (lineUserId) headers['x-line-user-id'] = lineUserId;
    return headers;
  }

  function statusNode(form) {
    let node = form.querySelector('[data-activity-fast-save-status]');
    if (node) return node;
    node = document.createElement('div');
    node.dataset.activityFastSaveStatus = '1';
    node.style.cssText = 'margin:8px 0;color:#475467;font-size:13px;font-weight:700';
    const submit = form.querySelector("button[type='submit']");
    if (submit) submit.insertAdjacentElement('beforebegin', node);
    else form.appendChild(node);
    return node;
  }

  function formValue(data, key, fallback = '') {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
  }

  async function fastSave(form) {
    const data = Object.fromEntries(new FormData(form));
    const id = String(formValue(data, 'id')).trim();
    if (!id) return;

    const status = statusNode(form);
    status.textContent = '活動內容儲存中…';
    status.style.color = '#475467';

    const payload = {
      name: String(formValue(data, 'name')).trim(),
      type: String(formValue(data, 'type')).trim(),
      courseTime: String(formValue(data, 'courseTime')),
      deadline: String(formValue(data, 'deadline')),
      capacity: Number(formValue(data, 'capacity', 0) || 0),
      checkinPoints: Number(formValue(data, 'checkinPoints', 0) || 0),
      feePoints: Number(formValue(data, 'feePoints', 0) || 0),
      registrationMode: String(formValue(data, 'registrationMode', 'form') || 'form'),
      status: String(formValue(data, 'status')),
      detailText: String(formValue(data, 'detailText', '')),
      formUrl: String(formValue(data, 'formUrl', '')),
      nativeFormUrl: String(formValue(data, 'nativeFormUrl', '')),
      posterUrl: String(formValue(data, 'posterUrl', '')),
      galleryUrls: String(formValue(data, 'galleryUrls', ''))
    };

    try {
      const response = await fetch(`${api}/api/activities/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: adminHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || '活動內容儲存失敗');
      status.textContent = '活動內容已儲存；報名表設定仍在背景同步。';
      status.style.color = '#027a48';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : '活動內容儲存失敗';
      status.style.color = '#b42318';
    }
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'drawer-activity') return;
    fastSave(form);
  }, true);
})();
