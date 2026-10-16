/* thais.coffee: comportamento das páginas (menu, timeline, depoimentos, filtros e contato) */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function show(el, on) { if (el) el.hidden = !on; }
  function within(el, cond) {
    // sobe até o bloco que contém a condição pedida (ex.: o card do emprego)
    while (el && el !== document.body) {
      var hit = el.querySelector('sc-if[data-if="' + cond + '"]');
      if (hit) return el;
      el = el.parentElement;
    }
    return null;
  }
  function on(name, fn) {
    $$('[data-on$=":' + name + '"]').forEach(function (el) {
      var ev = el.getAttribute('data-on').split(':')[0];
      el.addEventListener(ev, function (e) { fn.call(el, e); });
    });
  }

  /* ---------- menu */
  var nav = document.querySelector('.tnav');
  var menuBtn = nav && nav.querySelector('.tnav-ls');
  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle('open', open);
    $$('sc-if[data-if="menuOpen"]', nav).forEach(function (s) { show(s, open); });
    $$('sc-if[data-if="menuClosed"]', nav).forEach(function (s) { show(s, !open); });
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'fechar menu' : 'abrir menu');
    }
  }
  on('toggleMenu', function () { setMenu(!nav.classList.contains('open')); });
  on('closeMenu', function () { setMenu(false); });
  if (nav) {
    $$('.tnav-out a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); if (menuBtn) menuBtn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });
    // ao voltar para o desktop, o menu do celular fecha
    window.addEventListener('resize', function () { if (window.innerWidth > 1000) setMenu(false); });
  }

  /* ---------- sobre: o caminho do terminal acompanha a seção visível */
  var sub = nav && nav.querySelector('.tnav-prompt .tnav-sub');
  var secs = [['jeito-pra-coisa', '/jeito'], ['grandes-feitos', '/feitos'], ['por-onde-andei', '/andei'], ['como-diz-o-outro', '/dizem']];
  if (sub && document.getElementById(secs[0][0])) {
    var raf;
    var track = function () {
      var mid = window.innerHeight * 0.4, cur = '';
      secs.forEach(function (s) { var el = document.getElementById(s[0]); if (el && el.getBoundingClientRect().top <= mid) cur = s[1]; });
      if (sub.textContent !== cur) sub.textContent = cur;
    };
    window.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(track); }, { passive: true });
    track();
  }

  /* ---------- sobre: abrir a evolução de cargo */
  on('toggle', function () {
    var card = within(this, 'job.open');
    if (!card) return;
    var open = this.getAttribute('aria-expanded') !== 'true';
    $$('sc-if[data-if="job.open"]', card).forEach(function (s) { show(s, open); });
    $$('sc-if[data-if="job.closed"]', card).forEach(function (s) { show(s, !open); });
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = this.querySelector('span');
    if (label) label.textContent = open ? 'recolher' : 'ver evolução de cargo';
  });

  /* ---------- sobre: depoimentos (curtir e feed em looping) */
  var likes = {};
  on('like', function () {
    var post = this.closest('.t-post');
    var name = post && post.querySelector('.t-name') ? post.querySelector('.t-name').textContent : '';
    var liked = this.getAttribute('aria-pressed') !== 'true';
    likes[name] = liked;
    // as três cópias do mesmo depoimento ficam iguais
    $$('.t-post').forEach(function (p) {
      var n = p.querySelector('.t-name');
      if (!n || n.textContent !== name) return;
      var b = p.querySelector('.t-ibtn'), svg = b && b.querySelector('svg');
      if (!b) return;
      b.setAttribute('aria-pressed', liked ? 'true' : 'false');
      if (svg) svg.setAttribute('style', liked ? 'fill:#e97045;stroke:#292929;stroke-width:2' : 'fill:none;stroke:#292929;stroke-width:2');
    });
  });

  var sc = document.getElementById('dep2-scroll');
  if (sc) {
    var posts = $$('.t-post', sc);
    var feedLoop = function () {
      var third = sc.scrollHeight / 3;
      if (sc.scrollTop < third - 8) { sc.style.scrollSnapType = 'none'; sc.scrollTop += third; sc.style.scrollSnapType = ''; }
      else if (sc.scrollTop >= 2 * third - 8) { sc.style.scrollSnapType = 'none'; sc.scrollTop -= third; sc.style.scrollSnapType = ''; }
    };
    var token = 0;
    var feedGo = function (dir) {
      feedLoop();
      var top = sc.getBoundingClientRect().top;
      var pos = posts.map(function (e) { return e.getBoundingClientRect().top - top + sc.scrollTop; });
      var cur = sc.scrollTop, t;
      if (dir > 0) { for (var k = 0; k < pos.length; k++) if (pos[k] > cur + 8) { t = pos[k]; break; } }
      else { for (var m = pos.length - 1; m >= 0; m--) if (pos[m] < cur - 8) { t = pos[m]; break; } }
      if (t === undefined) return;
      if (reduce) { sc.scrollTop = t; return; }
      var from = sc.scrollTop, dist = t - from, dur = Math.min(1100, 420 + Math.abs(dist) * 0.7), t0 = performance.now(), my = ++token;
      sc.style.scrollSnapType = 'none';
      var step = function (now) {
        if (token !== my) return;
        var p = Math.min(1, (now - t0) / dur);
        sc.scrollTop = from + dist * (1 - Math.pow(1 - p, 4));
        if (p < 1) requestAnimationFrame(step); else { sc.scrollTop = t; sc.style.scrollSnapType = ''; }
      };
      requestAnimationFrame(step);
    };
    var loopT;
    sc.addEventListener('scroll', function () { clearTimeout(loopT); loopT = setTimeout(feedLoop, 120); }, { passive: true });
    on('feedUp', function () { feedGo(-1); });
    on('feedDown', function () { feedGo(1); });
    // começa na cópia do meio, para o looping funcionar para os dois lados
    var start = function () { if (sc.scrollTop < 8) sc.scrollTop = sc.scrollHeight / 3; };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
    setTimeout(start, 400);
  }

  /* ---------- portfólio: filtro por tipo de habilidade */
  var grid = document.querySelector('.flt-grid');
  var list = document.querySelector('ul.cases');
  if (grid && list) {
    var tpl = list.querySelector('li');
    var count = document.querySelector('.flt-n');
    var buttons = $$('.flt-o', grid);
    var data = null;
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var draw = function (fid) {
      if (!data) return;
      var all = fid === 'todos';
      var cases = data.C.map(function (c, idx) {
        var f = c.fit[fid];
        return { c: c, idx: idx, f: f, score: all ? 1 : (f ? f[0] : 0) };
      }).filter(function (x) { return x.score > 0; });
      if (!all) cases.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
      list.innerHTML = cases.map(function (x, k) {
        var li = tpl.cloneNode(true), c = x.c;
        li.querySelector('a.case').setAttribute('href', c.href);
        li.querySelector('.win-url').textContent = c.path;
        show(li.querySelector('sc-if[data-if="c.first"]'), !all && cases.length > 1 && k === 0);
        li.querySelector('.lbl').textContent = c.kicker;
        li.querySelector('.case-t').textContent = c.title;
        li.querySelector('.txt').textContent = c.desc;
        var n = li.querySelector('.case-n'); n.textContent = c.num; n.style.background = c.numBg;
        show(li.querySelector('sc-if[data-if="c.hasWhy"]'), !all && !!x.f);
        li.querySelector('.why-t').textContent = x.f ? x.f[1] : '';
        li.querySelector('.sk-list').innerHTML = c.skills.map(function (s) {
          return '<li' + (!all && s[1].indexOf(fid) > -1 ? ' class="hit"' : '') + '>' + esc(s[0]) + '</li>';
        }).join('');
        return li.outerHTML;
      }).join('');
      var nn = cases.length;
      count.textContent = all ? 'mostrando todos os ' + nn + ' cases'
        : (nn === 1 ? '1 case para esse perfil: ' + cases[0].c.title : nn + ' cases para esse perfil. comece por ' + cases[0].c.title + '.');
    };
    fetch('/assets/portfolio.json').then(function (r) { return r.json(); }).then(function (d) { data = d; });
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (!data) return;
        var fid = data.F[i].id;
        buttons.forEach(function (o, j) {
          o.className = j === i ? 'flt-o is-on' : 'flt-o';
          o.setAttribute('aria-pressed', j === i ? 'true' : 'false');
        });
        draw(fid);
      });
    });
  }

  /* ---------- contato */
  var form = document.querySelector('form[data-on="submit:submit"]');
  if (form) {
    var email = form.querySelector('#f-email');
    var err = form.querySelector('sc-if[data-if="emailInvalid"]');
    var tried = false;
    var valid = function () { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()); };
    var paint = function () {
      var bad = tried && !valid();
      show(err, bad);
      email.setAttribute('aria-invalid', bad ? 'true' : 'false');
    };
    email.addEventListener('input', function () { if (tried) paint(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid()) { tried = true; paint(); email.focus(); return; }
      tried = false; paint();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'enviando…'; }
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); })
        .then(function () {
          show(document.querySelector('sc-if[data-if="notSent"]'), false);
          show(document.querySelector('sc-if[data-if="sent"]'), true);
          form.reset();
        })
        .catch(function () {
          var fail = form.querySelector('.f-fail');
          if (fail) fail.hidden = false;
        })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
    on('reset', function () {
      show(document.querySelector('sc-if[data-if="sent"]'), false);
      show(document.querySelector('sc-if[data-if="notSent"]'), true);
      var n = form.querySelector('#f-nome'); if (n) n.focus();
    });
  }
})();
