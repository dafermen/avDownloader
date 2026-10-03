/* InnovaLogic documentation v1: dependency-free reading enhancements. */
(() => {
  const es = document.documentElement.lang.startsWith('es');
  const text = es ? { copy: 'Copiar código', copied: 'Copiado', denied: 'Selecciona el código para copiar', zoom: 'Ampliar imagen', close: 'Cerrar imagen' } : { copy: 'Copy code', copied: 'Copied', denied: 'Select the code to copy', zoom: 'Enlarge image', close: 'Close image' };
  const dialog = document.createElement('dialog');
  dialog.className = 'docs-image-dialog';
  dialog.setAttribute('aria-label', text.zoom);
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = text.close; close.autofocus = true;
  const preview = document.createElement('img');
  dialog.append(close, preview);
  document.body.append(dialog);
  let origin;
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (origin?.isConnected) origin.focus(); });
  const open = event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.hasAttribute('data-docs-zoom')) return;
    if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault(); origin = image; preview.src = image.currentSrc || image.src; preview.alt = image.alt; dialog.showModal();
  };
  document.addEventListener('click', open);
  document.addEventListener('keydown', open);
  function enhance(container) {
    if (!container) return;
    container.querySelectorAll('pre').forEach(pre => {
      if (pre.closest('.docs-code-block') || pre.querySelector('button')) return;
      const block = document.createElement('div'); block.className = 'docs-code-block';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'docs-code-copy'; button.textContent = text.copy;
      const status = document.createElement('span'); status.className = 'docs-reading-status'; status.setAttribute('role', 'status');
      pre.before(block); block.append(button, status, pre);
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.textContent || ''); status.textContent = text.copied; }
        catch { status.textContent = text.denied; }
      });
    });
    container.querySelectorAll('img').forEach(image => {
      if (image.closest('a, button') || image.hasAttribute('tabindex')) return;
      image.dataset.docsZoom = 'true'; image.tabIndex = 0; image.setAttribute('role', 'button'); image.setAttribute('aria-label', `${text.zoom}: ${image.alt || text.zoom}`);
    });
  }
  window.InnovaLogicDocs = { enhance };
  enhance(document.querySelector('article'));
})();
