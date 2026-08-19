(() => {
  const WAIT_QUIET_MS = 450;
  const MAX_WAIT_MS = 4000;

  function setHint(block, text) {
    let hint = block.querySelector('[data-edit-guard-hint]');
    if (!hint) {
      hint = document.createElement('div');
      hint.dataset.editGuardHint = '1';
      hint.style.cssText = 'font-size:13px;font-weight:700;color:#667085;margin-top:6px;';
      block.querySelector('.custom-fields-head')?.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = text || '';
  }

  function lockEditor(block, locked) {
    const add = block.querySelector('[data-add-custom-field]');
    if (add) add.disabled = Boolean(locked);
    block.querySelectorAll('[data-custom-fields] input,[data-custom-fields] select,[data-custom-fields] button').forEach((el) => {
      el.disabled = Boolean(locked);
    });
  }

  function guard(block) {
    if (!block || block.dataset.editGuardReady === '1') return;
    block.dataset.editGuardReady = '1';
    const list = block.querySelector('[data-custom-fields]');
    if (!list) return;

    lockEditor(block, true);
    setHint(block, '題目載入中…');

    let quietTimer = 0;
    let finished = false;
    const startedAt = Date.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(quietTimer);
      observer.disconnect();
      lockEditor(block, false);
      setHint(block, '');
    };

    const scheduleFinish = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, WAIT_QUIET_MS);
      if (Date.now() - startedAt >= MAX_WAIT_MS) finish();
    };

    const observer = new MutationObserver(scheduleFinish);
    observer.observe(list, { childList: true, subtree: true });
    scheduleFinish();
    setTimeout(finish, MAX_WAIT_MS);
  }

  function scan() {
    document.querySelectorAll('#drawer-activity .form-builder-block, #activity-form .form-builder-block').forEach(guard);
  }

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
