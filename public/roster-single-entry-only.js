(() => {
  const selectors = [
    '[data-import="association"]',
    '[data-import="vendor"]',
    '[data-sync-google-members]',
    '[data-sync-aiwe-uid]'
  ];

  const hideLegacyRosterControls = () => {
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      el.hidden = true;
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('tabindex', '-1');
    });
  };

  hideLegacyRosterControls();
  new MutationObserver(hideLegacyRosterControls)
    .observe(document.documentElement, { childList: true, subtree: true });
})();
