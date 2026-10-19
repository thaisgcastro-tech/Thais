/* thais.coffee: simulador de clareza do case de transparência (mesma lógica do canvas) */
(function () {
  var root = document.getElementById('sim-scr');
  if (!root) return;

  var SIM_L0 = {eyebrow:'CRÉDITO PESSOAL PRÉ-APROVADO*', title:'Operação de crédito com taxa a partir de 1,99% a.m.*', amount:'Limite disponível: R$ 5.000,00', body:'Simule sua operação de crédito pessoal na modalidade CDC com amortização via sistema Price. Encargos e tributos incidentes conforme legislação vigente.', foot:'*Taxa sujeita a análise de crédito. CET informado no contrato. IOF incidente sobre a operação. Condições podem ser alteradas sem aviso prévio.', cta:'contratar', safe:'', offer:'', inst:''};
  var SIM_L0T = [{},
   {eyebrow:'CRÉDITO PRÉ-APROVADO PRA VOCÊ*', title:'Sua operação de crédito com taxa a partir de 1,99% a.m.*', body:'Que tal simular sua operação de crédito pessoal? É na modalidade CDC, com amortização pelo sistema Price. Encargos e tributos conforme a legislação.', cta:'simular'},
   {eyebrow:'CRÉDITO PRÉ-APROVADO*', title:'Tá liberado: crédito com taxa a partir de 1,99% a.m.*', body:'Simula aí sua operação de crédito pessoal, modalidade CDC com amortização Price. Encargos e tributos rolam conforme a lei.', cta:'bora contratar'},
   {eyebrow:'CHUVA DE CRÉDITO PRÉ-APROVADO*', title:'Taxa a partir de 1,99% a.m.* pra tirar seus sonhos do papel!', body:'Sua operação de crédito pessoal tá prontinha! Modalidade CDC, amortização Price e aquele pacotão de encargos e tributos da legislação vigente.', cta:'quero já!'}];
  var SIM_T = [
   {label:'formal', nota:'Transmite seriedade e combina com comunicação regulatória. Pode soar distante para quem está pegando o primeiro empréstimo.',
    t:['Há um empréstimo disponível para você','É dinheiro disponível em sua conta hoje','É dinheiro disponível em sua conta hoje'],
    b:['O valor é depositado em sua conta e pago em parcelas fixas mensais. A taxa é de 3,2% ao mês.','Parcelas fixas mensais, sempre na mesma data. A taxa é de 3,2% ao mês.','Parcelas fixas mensais. Antes de decidir, confira o custo total da operação.'],
    c:['Contratar','Ver condições','Continuar','Contratar'],
    s:'Você revisa todas as condições antes de confirmar com sua senha. É possível desistir em até 7 dias, sem custo.'},
   {label:'amigável', nota:'Equilibra proximidade e confiança. Costuma ser o padrão em fintech, porque fala de dinheiro sem pesar.',
    t:['Você tem um empréstimo disponível','É dinheiro na sua conta hoje','É dinheiro na sua conta hoje'],
    b:['Você recebe o dinheiro na conta e paga em parcelas fixas todo mês. A taxa é de 3,2% ao mês.','Parcelas fixas todo mês, sempre no mesmo dia. A taxa é de 3,2% ao mês.','Parcelas fixas todo mês. Antes de decidir, veja quanto esse empréstimo custa no total.'],
    c:['Contratar','Ver condições','Continuar','Contratar'],
    s:'Você revisa tudo antes de confirmar com sua senha. Mudou de ideia? Pode desistir em até 7 dias sem custo.'},
   {label:'informal', nota:'Aproxima bastante. O cuidado é não soar descuidado com o dinheiro de quem lê.',
    t:['Tem um empréstimo te esperando','É dinheiro na conta hoje','É dinheiro na conta hoje'],
    b:['O dinheiro cai na sua conta e você paga em parcelas fixas todo mês. A taxa é 3,2% ao mês.','Parcela fixa todo mês, sempre no mesmo dia. Taxa de 3,2% ao mês.','Parcela fixa todo mês. Antes de fechar, dá uma olhada no quanto sai no total.'],
    c:['Quero contratar','Ver condições','Quero continuar','Contratar'],
    s:'Você confere tudo antes de confirmar com sua senha. Se mudar de ideia, dá pra desistir em até 7 dias sem pagar nada.'},
   {label:'divertido', nota:'Chama atenção, mas em crédito pode diminuir a sensação de segurança. Funciona melhor em campanha do que no momento da contratação.',
    t:['Bora tirar aquele plano da gaveta?','É dinheiro voando pra sua conta hoje','É dinheiro voando pra sua conta hoje'],
    b:['O dinheiro pousa na sua conta e você paga em parcelinhas fixas todo mês. Taxa de 3,2% ao mês, sem pegadinha.','Parcela fixa todo mês, sem surpresa no boleto. Taxa de 3,2% ao mês.','Parcela fixa todo mês. Antes do sim, olha quanto custa a festa inteira.'],
    c:['Bora!','Mostra as condições','Fechar negócio','Fechar negócio'],
    s:'Nada de clique no susto: você revisa tudo e confirma com sua senha. Bateu arrependimento? Desiste em até 7 dias, de graça.'}];
  var SIM_FOOT = ['Taxa definida depois da análise do seu perfil. O valor final está no contrato.','','Juros de 3,2% ao mês. O custo efetivo total (CET) já inclui juros e IOF.'];
  var SIM_NIVEIS = ['original','linguagem','hierarquia','custo total','segurança'];
  var SIM_NOTAS = [
   {t:'linguagem simples', d:'Troca jargão por palavras do dia a dia. "Operação de crédito" vira "empréstimo".'},
   {t:'hierarquia', d:'O que a pessoa precisa decidir vem primeiro: quanto pega e quanto paga por mês.'},
   {t:'transparência', d:'O custo total sai do rodapé e aparece antes do botão, com juros e IOF separados.'},
   {t:'segurança', d:'Diz o que acontece depois e como desistir. Ninguém contrata no escuro.'}];
  var GLYPHS = '█▓▒░#%&@$<>/\\=+*';
  function brl(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  var P = 5000, I = 0.032, N = 12;
  var PMT = P * I / (1 - Math.pow(1 + I, -N));
  var IOF = Math.round(P * (0.0038 + 0.000082 * 365) * 100) / 100;
  function texts(v, tone) {
    if (v === 0) return Object.assign({}, SIM_L0, SIM_L0T[tone]);
    var k = Math.min(v, 3) - 1, t = SIM_T[tone];
    return { eyebrow: '', offer: 'oferta disponível', title: t.t[k], amount: v === 1 ? 'Até R$ 5.000' : 'R$ 5.000', inst: v === 1 ? '' : 'em 12x de ' + brl(PMT), body: t.b[k], foot: SIM_FOOT[k], cta: t.c[v - 1], safe: t.s };
  }

  var $ = function (sel) { return document.querySelector(sel); };
  var nivelIn = $('#sim-nivel'), tomIn = $('#sim-tom');
  var fields = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-k]'), function (el) { fields[el.getAttribute('data-k')] = el; });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // listas fixas: marcas dos controles e notas
  function ticks(box, labels) {
    box.innerHTML = '';
    return labels.map(function (l, i) {
      var s = document.createElement('span');
      s.style.setProperty('--i', i);
      s.textContent = l;
      box.appendChild(s);
      return s;
    });
  }
  var nTicks = ticks($('[data-sim="nivelTicks"]'), SIM_NIVEIS);
  var tTicks = ticks($('[data-sim="tomTicks"]'), SIM_T.map(function (t) { return t.label; }));
  var notasBox = $('[data-sim="notas"]');
  var notas = SIM_NOTAS.map(function (n) {
    var w = document.createElement('div'); w.className = 'sim-nw';
    var inner = document.createElement('div');
    var p = document.createElement('p'); p.className = 'sim-bar';
    var st = document.createElement('strong'); st.textContent = n.t;
    var sp = document.createElement('span'); sp.textContent = n.d;
    p.appendChild(st); p.appendChild(sp); inner.appendChild(p); w.appendChild(inner); notasBox.appendChild(w);
    return w;
  });
  var tomNota = $('[data-sim="tomNota"]');
  [['vRec', brl(P)], ['vJur', brl(PMT * N - P)], ['vIof', brl(IOF)], ['vTot', brl(PMT * N + IOF)]].forEach(function (p) {
    var el = root.querySelector('[data-v="' + p[0] + '"]'); if (el) el.textContent = p[1];
  });

  var state = { nivel: 0, tom: 0, disp: texts(0, 0) }, raf = 0;
  function paint(d) { Object.keys(fields).forEach(function (k) { var v = d[k] || ''; if (fields[k].textContent !== v) fields[k].textContent = v; }); }
  function chrome() {
    var v = state.nivel, tone = state.tom, cls = 'sim-scr';
    for (var k = 0; k <= v; k++) cls += ' l' + k;
    root.className = cls;
    nivelIn.value = v; tomIn.value = tone;
    nivelIn.style.setProperty('--f', v / 4); tomIn.style.setProperty('--f', tone / 3);
    nTicks.forEach(function (s, i) { s.className = i === v ? 'on' : ''; });
    tTicks.forEach(function (s, i) { s.className = i === tone ? 'on' : ''; });
    notas.forEach(function (w, i) { w.className = 'sim-nw' + (i + 1 <= v ? ' on' : ''); });
    tomNota.textContent = SIM_T[tone].nota + (v === 0 ? ' Repare que nenhum tom resolve a falta de informação.' : '');
  }
  function goTo(nivel, tom) {
    var target = texts(nivel, tom), from = Object.assign({}, state.disp);
    state.nivel = nivel; state.tom = tom; chrome();
    cancelAnimationFrame(raf);
    if (reduce) { state.disp = target; paint(target); return; }
    var keys = Object.keys(target), t0 = performance.now();
    var step = function (now) {
      var out = {}, busy = false;
      keys.forEach(function (key) {
        var a = from[key] || '', b = target[key] || '';
        if (a === b) { out[key] = b; return; }
        var len = Math.max(a.length, b.length), dur = Math.min(900, 250 + len * 8), k = Math.min(1, (now - t0) / dur);
        if (k >= 1) { out[key] = b; return; }
        busy = true;
        var cut = Math.floor(k * len), s = '';
        for (var j = 0; j < len; j++) {
          if (j < cut) s += b[j] || '';
          else if (j < cut + 6) s += (b[j] === ' ' || a[j] === ' ') ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          else s += a[j] || '';
        }
        out[key] = s;
      });
      state.disp = out; paint(out);
      if (busy) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  nivelIn.addEventListener('input', function () { goTo(+nivelIn.value, state.tom); });
  tomIn.addEventListener('input', function () { goTo(state.nivel, +tomIn.value); });
  chrome(); paint(state.disp);
})();
