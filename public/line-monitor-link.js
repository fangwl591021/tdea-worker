(() => {
  const targetUrl = 'public/line-monitor.html';
  function openMonitor() {
    window.location.href = targetUrl;
  }
  function registerMonitor() {
    if (window.TDEALineNav && typeof window.TDEALineNav.register === 'function') {
      window.TDEALineNav.register({
        id: 'line-monitor',
        label: 'AI監控',
        order: 5,
        onClick: openMonitor,
        isActive: () => location.pathname.endsWith('/line-monitor.html')
      });
      window.TDEALineNav.refresh?.();
      return true;
    }
    return false;
  }
  function fallbackLink() {
    if (document.querySelector('[data-line-monitor-link]')) return;
    const nav = document.querySelector('.line-nav-children') || document.querySelector('.nav');
    if (!nav) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lineMonitorLink = '1';
    button.textContent = 'AI監控';
    button.title = 'LINE AI 後台監控';
    button.addEventListener('click', openMonitor);
    nav.appendChild(button);
  }
  function boot() {
    if (!registerMonitor()) fallbackLink();
  }
  boot();
  setTimeout(boot, 100);
  setTimeout(boot, 500);
  setTimeout(boot, 1200);
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
})();
