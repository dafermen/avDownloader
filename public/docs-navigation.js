/* Local documentation controls; no requests to media providers or application APIs. */
(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('#docs-theme');
  const menu = document.querySelector('#docs-menu');
  const input = document.querySelector('#docs-search');
  const results = document.querySelector('#docs-results');
  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.docs-sidebar a')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let theme;
  try { theme = localStorage.getItem('vdownloader-docs-theme'); } catch { /* System theme remains available. */ }
  function setTheme(value) {
    root.dataset.theme = value;
    themeButton.textContent = value === 'dark' ? 'Light mode' : 'Dark mode';
    themeButton.setAttribute('aria-pressed', String(value === 'dark'));
    try { localStorage.setItem('vdownloader-docs-theme', value); } catch { /* In-memory choice. */ }
  }
  setTheme(['light','dark'].includes(theme) ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  function setMenu(open) { document.body.classList.toggle('docs-menu-open', open); menu.setAttribute('aria-expanded', String(open)); }
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  links.forEach(link => link.addEventListener('click', () => setMenu(false)));
  input.addEventListener('input', () => {
    results.replaceChildren();
    const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    results.hidden = !terms.length;
    if (!terms.length) return;
    const matches = sections.filter(section => terms.every(term => normalize(section.textContent).includes(term))).slice(0,8);
    for (const section of matches) {
      const a = document.createElement('a'); a.href = '#'+section.id; a.textContent = section.querySelector('h1,h2').textContent;
      a.addEventListener('click', () => { results.hidden = true; input.value = ''; }); results.append(a);
    }
    if (!matches.length) results.textContent = 'No matching documentation.';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { results.hidden = true; if (menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !/INPUT|TEXTAREA/.test(event.target.tagName)) { event.preventDefault(); input.focus(); }
  });
  const pager = document.querySelector('.docs-pagination');
  function activate(section) {
    const index = sections.indexOf(section);
    links.forEach(link => { if (link.hash === '#'+section.id) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });
    pager.replaceChildren();
    for (const [target,label] of [[sections[index-1],'Previous'],[sections[index+1],'Next']]) {
      if (!target) continue;
      const a = document.createElement('a'); a.href = '#'+target.id; a.textContent = label+': '+target.querySelector('h1,h2').textContent; pager.append(a);
    }
  }
  const observer = new IntersectionObserver(entries => { const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0]; if (visible) activate(visible.target); },{rootMargin:'-15% 0px -65% 0px'});
  sections.forEach(section=>observer.observe(section)); activate(sections[0]);
  window.InnovaLogicDocs.enhance(document.querySelector('main'));
})();
