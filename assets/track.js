// Eventos do Umami (thais.coffee). As visitas de página o Umami já conta sozinho;
// aqui ficam as interações. Tudo por delegação, porque o dc.js redesenha as páginas.
(function () {
  var send = function (name, data) {
    try { if (window.umami && typeof umami.track === 'function') umami.track(name, data); } catch (e) {}
  };
  var path = location.pathname;
  var caseSlug = (path.match(/^\/cases\/([^/]+)/) || [])[1];

  // cliques: links, idioma, pastas da gaveta
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('a, button') : null;
    if (!el) return;
    if (el.classList.contains('lng-b')) {
      send('idioma', { para: el.getAttribute('lang') === 'en' ? 'en' : 'pt', pagina: path });
      return;
    }
    if (el.classList.contains('pf-tab')) {
      send('opiniao: abriu pasta', { texto: el.getAttribute('title') || '' });
      return;
    }
    if (el.tagName !== 'A') return;
    var href = el.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) { send('contato: e-mail', { pagina: path }); return; }
    if (/linkedin\.com\/in\/thaisgcastro/i.test(href)) { send('contato: linkedin', { pagina: path }); return; }
    if (/linkedin\.com\/in\//i.test(href)) { send('depoimento: linkedin', { perfil: href.replace(/.*\/in\/([^/?#]+).*/, '$1') }); return; }
    var c = href.match(/^\/cases\/([^/]+)/);
    if (c) { send('case: clique', { case: c[1], origem: path }); return; }
    if (/^\/quiz\/?$/.test(href)) { send('quiz: clique no link', { origem: path }); return; }
    if (/^https?:\/\//.test(href) && el.host !== location.host) {
      send('link externo', { destino: el.host, pagina: path });
    }
  }, true);

  // busca de cases: registra o termo depois que a pessoa para de digitar
  var timer, last = '';
  document.addEventListener('input', function (ev) {
    if (!ev.target || ev.target.id !== 'srch-in') return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      var q = (ev.target.value || '').trim().toLowerCase();
      if (q.length < 2 || q === last) return;
      last = q;
      var msg = ((document.querySelector('.flt-n') || {}).textContent || '').toLowerCase();
      var res = /nenhum case fala de|no case talks about/.test(msg) ? 'nenhum'
        : /nenhum case fala exatamente|no case talks exactly/.test(msg) ? 'parecido' : 'encontrou';
      send('busca de cases', { termo: q.slice(0, 60), resultado: res });
    }, 1500);
  }, true);

  // quanto da página de case foi lida
  if (caseSlug) {
    var marks = [25, 50, 75, 100], done = {};
    var onScroll = function () {
      var d = document.documentElement;
      var max = d.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var pct = (window.scrollY / max) * 100;
      marks.forEach(function (m) {
        if (!done[m] && pct >= m - 2) { done[m] = 1; send('case: leitura', { case: caseSlug, rolagem: m + '%' }); }
      });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true });
  }

  // quiz de match: início e resultado
  if (/^\/quiz\/?$/.test(path)) {
    var started = false, finished = false;
    var faixa = function (n) { return n >= 90 ? '90-100%' : n >= 70 ? '70-89%' : n >= 50 ? '50-69%' : '0-49%'; };
    new MutationObserver(function () {
      if (document.querySelector('.hud') && !started) { started = true; send('quiz: iniciado'); }
      var tier = document.querySelector('.tier');
      if (!tier) { finished = false; return; }
      if (!finished) {
        finished = true;
        setTimeout(function () {
          var p = document.querySelector('.pct');
          var n = parseInt(((p || {}).textContent || '').replace(/\D/g, ''), 10);
          if (isNaN(n)) return;
          send('quiz: concluído', { match: faixa(n), nivel: ((document.querySelector('.tier') || {}).textContent || '').trim() });
          started = false;
        }, 3500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
