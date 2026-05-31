(() => {
  const targetUrl = 'public/line-monitor.html';
  function addMonitorLink() {
    const nav = document.querySelector('.line-nav-children') || document.querySelector('.nav');
    if (!nav || document.querySelector('[data-line-monitor-link]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lineMonitorLink = '1';
    button.textContent = 'AI監控';
    button.title = 'LINE AI 後台監控';
    button.addEventListener('click', () => { window.location.href = targetUrl; });
    nav.appendChild(button);
  }
  const original = window.TDEALineNav && window.TDEALineNav.refresh;
  window.TDEALineNav = window.TDEALineNav || {};
  window.TDEALineNav.refresh = function patchedRefresh() {
    if (typeof original === 'function') original.call(this);
    addMonitorLink();
  };
  const observer = new MutationObserver(addMonitorLink);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addMonitorLink();
})();
