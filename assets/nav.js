/* menu: linha de comando. O caminho do prompt acompanha a seção visível. */
(function () {
  var nav = document.querySelector('.tnav');
  if (!nav) return;
  var pathEl = nav.querySelector('.tnav-path');
  var base = nav.dataset.base || '~';
  var links = nav.querySelectorAll('a[data-dir]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shown = null, typing;

  // digita o caminho novo, como num terminal
  function setPath(dir) {
    if (dir === shown) return;
    shown = dir;
    var full = dir ? base + '/' + dir : base;
    links.forEach(function (a) {
      if (a.dataset.dir === dir) a.setAttribute('aria-current', 'location');
      else if (a.getAttribute('aria-current') === 'location') a.removeAttribute('aria-current');
    });
    clearInterval(typing);
    if (reduce) { pathEl.textContent = full; return; }
    var i = base.length;
    pathEl.textContent = base;
    typing = setInterval(function () {
      i++;
      pathEl.textContent = full.slice(0, i);
      if (i >= full.length) clearInterval(typing);
    }, 28);
  }

  // qual seção está no meio da tela
  var secs = Array.prototype.slice.call(document.querySelectorAll('[data-dir-section]'));
  function update() {
    var mid = window.innerHeight * 0.4, cur = null;
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= mid) cur = s.dataset.dirSection; });
    setPath(cur);
  }
  var raf;
  window.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  update();

  // celular: "ls" abre a lista
  var btn = nav.querySelector('.tnav-ls');
  function close() { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function () {
    var open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('.tnav-out a').forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) close(); });
})();
