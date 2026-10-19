/* thais.coffee: gaveta de opiniões. Clicar numa aba puxa a pasta para a frente (mesma lógica do canvas). */
(function () {
  var box = document.querySelector('[data-gaveta]');
  if (!box) return;

  var SMILE = 'M0 0h1v1h-1zM2 0h1v1h-1zM4 0h1v1h-1zM1 1h3v1h-3zM0 2h5v1h-5zM1 3h3v1h-3zM0 4h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1z';
  var BG = '<svg class="pf-bg" aria-hidden="true" width="344" height="42" viewBox="0 0 344 42"><polygon points="8,50 8,8 304,8 344,50" fill="#292929"></polygon><polygon points="0,44 0,0 296,0 336,44" fill="#292929"></polygon></svg>';
  var PASTAS = JSON.parse(box.getAttribute('data-pastas'));

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function label(p) {
    return '<span class="pf-tab-l"><svg aria-hidden="true" width="10" height="10" viewBox="0 0 5 5" shape-rendering="crispEdges"><path fill="' + p.cor + '" d="' + SMILE + '"></path></svg>pasta ' + p.num + ' · ' + esc(p.aba) + '</span>';
  }
  function render(ativa, focar) {
    var frente = PASTAS.filter(function (p) { return p.num === ativa; })[0] || PASTAS[0];
    var fundo = PASTAS.filter(function (p) { return p !== frente; }).reverse();
    var h = '';
    fundo.forEach(function (p) {
      h += '<div class="pf-sheet"><button type="button" class="pf-tab ' + p.pos + '" data-puxar="' + p.num + '" aria-label="puxar a pasta ' + p.num + ': ' + esc(p.titulo) + '">' + BG + label(p) + '</button></div>';
    });
    h += '<a class="item pf-front" href="' + p_href(frente) + '"><span class="pf-tab ' + frente.pos + '" aria-hidden="true">' + BG + label(frente) + '</span>' +
      '<span class="pf-bar"><span>texto nº ' + frente.num + '</span><span>' + esc(frente.tempo) + '</span></span>' +
      '<span class="pf-in"><span class="item-path">' + esc(frente.path) + '</span><span class="item-t">' + esc(frente.titulo) + '</span><span class="item-d">' + esc(frente.desc) + '</span>' +
      '<span class="item-f">' + frente.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '<span class="item-go" aria-hidden="true">ler texto →</span></span></span></a>';
    box.innerHTML = h;
    if (focar) { var a = box.querySelector('.pf-front'); if (a) a.focus(); }
  }
  function p_href(p) { return p.href; }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-puxar]');
    if (!b) return;
    render(b.getAttribute('data-puxar'), true);
  });
})();
