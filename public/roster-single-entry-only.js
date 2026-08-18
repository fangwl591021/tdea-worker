(() => {
  const hideBatchImports = () => {
    document.querySelectorAll('[data-import="association"], [data-import="vendor"]').forEach((el) => {
      el.hidden = true;
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('tabindex', '-1');
    });
  };
  hideBatchImports();
  new MutationObserver(hideBatchImports).observe(document.documentElement, { childList: true, subtree: true });
})();
