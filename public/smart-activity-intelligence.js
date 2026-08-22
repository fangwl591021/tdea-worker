(() => {
  const originalFetch = window.fetch.bind(window);
  let latest = null;

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[ch]));
  }

  function typeLabel(type) {
    return ({
      text:'簡答',
      email:'Email',
      number:'數字',
      radio:'單選',
      checkbox:'複選',
      dropdown:'下拉選單',
      paragraph:'段落',
      attachment:'附件',
      payment:'付款',
      quantity:'數量'
    })[type] || type || '簡答';
  }

  function normalizeType(type) {
    const value = String(type || 'text').trim();
    if (value === 'quantity') return 'number';
    if (value === 'payment') return 'text';
    if (value === 'attachment') return 'text';
    return ['text','email','number','radio','checkbox','dropdown','paragraph'].includes(value)
      ? value
      : 'text';
  }

  function smartHint(field) {
    const label = String(field?.label || '').trim();

    if (field?.description || field?.helpText || field?.helperText) {
      return String(field.description || field.helpText || field.helperText);
    }

    if (/釣蝦竿數|釣竿數/.test(label)) {
      return '參加比賽者請填寫使用的釣竿數量；若活動依竿計費，請依活動說明計算費用。';
    }

    if (/比賽餐敘人數/.test(label)) {
      return '參加比賽且需要餐敘者，請填寫實際用餐人數。';
    }

    if (/純餐敘人數/.test(label)) {
      return '未參加比賽、僅參加餐敘者，請填寫實際用餐人數。';
    }

    if (/匯款/.test(label) && /末五碼|末5碼/.test(label)) {
      return '完成匯款後請填寫匯款帳號末 5 碼，方便主辦單位核對款項。';
    }

    if (/公協會/.test(label)) {
      return '請選擇您所屬的公協會。';
    }

    if (/備註/.test(label)) {
      return '特殊需求、同行者資訊、飲食需求或其他事項可填寫於此。';
    }

    return '';
  }

  function smartPlaceholder(field) {
    if (field?.placeholder) return String(field.placeholder);

    const label = String(field?.label || '').trim();

    if (/釣蝦竿數|釣竿數/.test(label)) return '例如：1';
    if (/餐敘人數/.test(label)) return '例如：2';
    if (/匯款/.test(label) && /末五碼|末5碼/.test(label)) return '例如：12345';
    if (/備註/.test(label)) return '如無備註可留空';

    return '';
  }

  function fieldSpecs() {
    if (!latest) return [];

    if (!Array.isArray(latest.registrationFieldSpecs)) {
      latest.registrationFieldSpecs = [];
    }

    if (!latest.registrationFieldSpecs.length && Array.isArray(latest.registrationFields)) {
      latest.registrationFieldSpecs = latest.registrationFields.map((label, index) => ({
        key: 'custom_' + (index + 1),
        label: String(label || '').trim(),
        type: 'text',
        required: false
      }));
    }

    latest.registrationFieldSpecs = latest.registrationFieldSpecs
      .filter(field => field && String(field.label || '').trim())
      .map((field, index) => ({
        ...field,
        key: String(field.key || 'custom_' + (index + 1)).trim(),
        label: String(field.label || '').trim(),
        type: normalizeType(field.type),
        required: Boolean(field.required),
        description: smartHint(field),
        placeholder: smartPlaceholder(field),
        options: Array.isArray(field.options)
          ? field.options.map(v => String(v || '').trim()).filter(Boolean)
          : []
      }));

    return latest.registrationFieldSpecs;
  }

  function syncEditedAnalysis() {
    if (!latest) return;

    latest.registrationFields = fieldSpecs().map(field => field.label);

    window.tdeaSmartActivityEditedAnalysis = latest;

    window.dispatchEvent(new CustomEvent('tdea-smart-analysis-edited', {
      detail: latest
    }));
  }

  function optionsText(field) {
    return Array.isArray(field.options) ? field.options.join('\n') : '';
  }

  function fieldCard(field, index) {
    const type = normalizeType(field.type);
    const needsOptions = ['radio','checkbox','dropdown'].includes(type);

    return `
      <article class="smart-field-preview-card" data-smart-field-index="${index}"
        style="border:1px solid #d0d5dd;border-radius:12px;padding:14px;background:#fff;display:grid;gap:10px">

        <div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px">
          <label style="display:grid;gap:5px;font-size:12px;color:#667085">
            題目名稱
            <input
              data-smart-field-label
              value="${esc(field.label)}"
              style="width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:10px;font-size:15px">
          </label>

          <label style="display:grid;gap:5px;font-size:12px;color:#667085">
            題型
            <select
              data-smart-field-type
              style="width:100%;border:1px solid #d0d5dd;border-radius:8px;padding:10px;background:#fff">
              ${[
                ['text','簡答'],
                ['number','數字'],
                ['email','Email'],
                ['paragraph','段落'],
                ['radio','單選'],
                ['checkbox','複選'],
                ['dropdown','下拉選單']
              ].map(([value,label]) =>
                `<option value="${value}" ${type === value ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </label>
        </div>

        <label style="display:grid;gap:5px;font-size:12px;color:#667085">
          欄位說明
          <textarea
            data-smart-field-description
            rows="2"
            placeholder="告訴報名者這一題要填什麼、費用或限制"
            style="width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:10px;resize:vertical">${esc(field.description || '')}</textarea>
        </label>

        <label style="display:grid;gap:5px;font-size:12px;color:#667085">
          輸入提示
          <input
            data-smart-field-placeholder
            value="${esc(field.placeholder || '')}"
            placeholder="例如：1"
            style="width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:10px">
        </label>

        ${needsOptions ? `
          <label style="display:grid;gap:5px;font-size:12px;color:#667085">
            選項（每行一個）
            <textarea
              data-smart-field-options
              rows="3"
              style="width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:10px;resize:vertical">${esc(optionsText(field))}</textarea>
          </label>
        ` : ''}

        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:7px;font-weight:700">
            <input type="checkbox" data-smart-field-required ${field.required ? 'checked' : ''}>
            必填
          </label>

          <div style="display:flex;gap:7px">
            <button type="button" data-smart-field-up
              style="border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:7px 11px;font-weight:700;cursor:pointer">上移</button>

            <button type="button" data-smart-field-down
              style="border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:7px 11px;font-weight:700;cursor:pointer">下移</button>

            <button type="button" data-smart-field-delete
              style="border:1px solid #fda29b;background:#fff;color:#d92d20;border-radius:8px;padding:7px 11px;font-weight:700;cursor:pointer">刪除</button>
          </div>
        </div>

        <div style="border-top:1px solid #eaecf0;padding-top:10px">
          <div style="font-size:12px;color:#667085;margin-bottom:4px">報名者實際看到</div>
          <div style="font-weight:800;color:#111827">
            ${esc(field.label)}
            ${field.required ? '<span style="color:#d92d20">*</span>' : ''}
          </div>
          ${field.description
            ? `<div style="font-size:13px;color:#667085;line-height:1.5;margin-top:4px">${esc(field.description)}</div>`
            : ''}
          <div style="margin-top:7px;border:1px solid #d0d5dd;border-radius:8px;padding:10px;color:#98a2b3;background:#fafafa">
            ${esc(field.placeholder || (needsOptions ? '請選擇' : '請輸入'))}
          </div>
        </div>
      </article>
    `;
  }

  function renderFieldPreview(box) {
    const fields = fieldSpecs();

    const preview = `
      <div style="margin-top:16px;border-top:2px solid #e4e7ec;padding-top:14px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-size:16px;font-weight:900;color:#101828">5. AI 建議報名欄位</div>
            <div style="font-size:12px;color:#667085;margin-top:3px">
              先確認實際欄位，再建立活動。這裡修改的內容會直接帶入正式報名表。
            </div>
          </div>

          <button type="button" data-smart-add-field
            style="border:1px solid #7f56d9;background:#fff;color:#6941c6;border-radius:8px;padding:8px 11px;font-weight:800;cursor:pointer">
            ＋新增題目
          </button>
        </div>

        <div data-smart-field-list style="display:grid;gap:10px">
          ${fields.length
            ? fields.map(fieldCard).join('')
            : '<div style="padding:14px;border:1px dashed #d0d5dd;border-radius:10px;color:#667085;text-align:center">AI 尚未產生報名欄位，可先新增題目。</div>'}
        </div>

        <div style="margin-top:12px;padding:10px 12px;border-radius:9px;background:#f9f5ff;color:#6941c6;font-size:12px;line-height:1.55">
          建議流程：確認題目名稱 → 說明 → 提示 → 必填 → 題型／選項 → 再按下方「確認並上架」。
        </div>
      </div>
    `;

    return preview;
  }

  function bindFieldPreview(box) {
    const list = box.querySelector('[data-smart-field-list]');
    if (!list) return;

    list.querySelectorAll('[data-smart-field-index]').forEach(card => {
      const index = Number(card.dataset.smartFieldIndex || -1);
      if (index < 0) return;

      const apply = () => {
        const field = fieldSpecs()[index];
        if (!field) return;

        field.label = String(card.querySelector('[data-smart-field-label]')?.value || '').trim();
        field.type = normalizeType(card.querySelector('[data-smart-field-type]')?.value);
        field.description = String(card.querySelector('[data-smart-field-description]')?.value || '').trim();
        field.placeholder = String(card.querySelector('[data-smart-field-placeholder]')?.value || '').trim();
        field.required = Boolean(card.querySelector('[data-smart-field-required]')?.checked);

        const options = card.querySelector('[data-smart-field-options]');
        if (options) {
          field.options = String(options.value || '')
            .split(/\r?\n|,/)
            .map(v => v.trim())
            .filter(Boolean);
        }

        syncEditedAnalysis();
      };

      card.querySelectorAll('input,textarea,select').forEach(el => {
        el.addEventListener('input', apply);
        el.addEventListener('change', () => {
          apply();
          renderPanel();
        });
      });

      card.querySelector('[data-smart-field-up]')?.addEventListener('click', () => {
        const fields = fieldSpecs();
        if (index <= 0) return;
        [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
        syncEditedAnalysis();
        renderPanel();
      });

      card.querySelector('[data-smart-field-down]')?.addEventListener('click', () => {
        const fields = fieldSpecs();
        if (index >= fields.length - 1) return;
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
        syncEditedAnalysis();
        renderPanel();
      });

      card.querySelector('[data-smart-field-delete]')?.addEventListener('click', () => {
        latest.registrationFieldSpecs.splice(index, 1);
        syncEditedAnalysis();
        renderPanel();
      });
    });

    box.querySelector('[data-smart-add-field]')?.addEventListener('click', () => {
      const fields = fieldSpecs();

      fields.push({
        key: 'custom_' + (Date.now()),
        label: '新題目',
        type: 'text',
        required: false,
        description: '',
        placeholder: ''
      });

      syncEditedAnalysis();
      renderPanel();

      setTimeout(() => {
        const cards = box.querySelectorAll('[data-smart-field-index]');
        const last = cards[cards.length - 1];
        last?.querySelector('[data-smart-field-label]')?.focus();
      }, 0);
    });
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
    const agenda = Array.isArray(latest.agenda) ? latest.agenda : [];
    const rules = Array.isArray(latest.activityRules) ? latest.activityRules : [];
    const onsite = Array.isArray(latest.optionalOnsiteItems) ? latest.optionalOnsiteItems : [];

    const html = `
      <label class="smart-builder-label">4. AI 規則解析</label>

      <div style="display:grid;gap:10px;font-size:13px">
        <div><strong>活動類型：</strong>${esc(latest.activityType || latest.category || '一般活動')}</div>

        ${latest.deadline
          ? `<div><strong>截止：</strong>${esc(latest.deadline)}</div>`
          : ''}

        ${quantities.length
          ? `<div><strong>獨立數量：</strong>${quantities.map(q =>
              `${esc(q.label)}（${esc(q.key)}）`
            ).join('、')}</div>`
          : ''}

        ${pricing.length
          ? `<div>
              <strong>計價公式：</strong>
              <div style="margin-top:6px;display:grid;gap:4px">
                ${pricing.map(p =>
                  `<span>• ${esc(p.name)}：$${Number(p.amount || 0).toLocaleString('zh-TW')} × ${esc(p.quantityKey || p.unit || '單位')}</span>`
                ).join('')}
              </div>
            </div>`
          : ''}

        ${onsite.length
          ? `<div><strong>現場／選配：</strong>${onsite.map(p =>
              `${esc(p.name)} $${Number(p.amount || 0).toLocaleString('zh-TW')}`
            ).join('、')}</div>`
          : ''}

        ${agenda.length
          ? `<div><strong>行程節點：</strong>${agenda.length} 個</div>`
          : ''}

        ${rules.length
          ? `<details open>
              <summary style="cursor:pointer;font-weight:700">活動規則 ${rules.length} 項</summary>
              <div style="margin-top:6px;display:grid;gap:4px">
                ${rules.map(r => `<span>• ${esc(r)}</span>`).join('')}
              </div>
            </details>`
          : ''}
      </div>

      ${renderFieldPreview(box)}
    `;

    box.innerHTML = html;
    bindFieldPreview(box);

    syncEditedAnalysis();
  }

  window.fetch = async (resource, options = {}) => {
    const response = await originalFetch(resource, options);

    try {
      const url = typeof resource === 'string'
        ? resource
        : resource?.url || '';

      if (url.includes('/api/smart-activities/analyze') && response.ok) {
        const clone = response.clone();
        const payload = await clone.json().catch(() => null);

        if (payload?.success && payload?.data) {
          latest = structuredClone
            ? structuredClone(payload.data)
            : JSON.parse(JSON.stringify(payload.data));

          syncEditedAnalysis();

          setTimeout(renderPanel, 0);
          setTimeout(renderPanel, 300);
          setTimeout(renderPanel, 800);
        }
      }
    } catch (_) {}

    return response;
  };
})();
