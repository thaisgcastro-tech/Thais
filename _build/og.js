#!/usr/bin/env node
// Gera as imagens de compartilhamento (og:image, 1200x630) e os favicons em PNG.
// Uso: node _build/og.js   (grava em /assets/og/ e /assets/icons/)
// Os textos e caminhos de cada página ficam em OG_PAGES, abaixo; o build.py usa os mesmos slugs.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const FONTS = path.join(__dirname, 'og');
const OUT = path.join(ROOT, 'assets', 'og');
const ICONS = path.join(ROOT, 'assets', 'icons');

const OG_PAGES = [
  ['sobre', 'sobre/', 'product designer', 'thais castro', 'portfólio // product designer // content designer\nbusiness design // UX // IA // banking // fintech :)'],
  ['portfolio', 'portfolio/', 'cases', 'portfólio', 'do problema ao número que eles moveram'],
  ['transparencia', 'portfolio/transparencia', 'case', 'transparência como regra de produto', 'produtos de crédito · will bank'],
  ['este-portfolio', 'portfolio/este-portfolio', 'case', 'este portfólio, feito com ia', 'desenho, texto e código em parceria'],
  ['refinanciamento-em-dia', 'portfolio/refin', 'case', 'refinanciamento em dia', 'bons pagadores ajustando o empréstimo antes de atrasar'],
  ['lembrete-de-pagamento', 'portfolio/lembrete', 'case', 'lembrete de pagamento', '−64,7% no saldo em atraso'],
  ['opiniao', 'opiniao/', 'textos', 'opinião', 'design de produto, dados, processo e ia'],
  ['opiniao-ia', 'opiniao/ia', 'opinião', 'ia não faz bons designers', 'um texto de thais castro'],
  ['opiniao-conteudo-e-dados', 'opiniao/conteudo-e-dados', 'opinião', 'content designer também abre planilha', 'um texto de thais castro'],
  ['opiniao-roadmap', 'opiniao/roadmap', 'opinião', 'ninguém me chamou pra mesa do roadmap', 'um texto de thais castro'],
  ['contato', 'contato/', 'contato', 'fale comigo', 'oi@thais.coffee'],
  ['quiz', 'quiz/', 'quiz para recrutadores', 'eu sou a pessoa certa pra você?', 'descubra a porcentagem de match'],
];

const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const goks = 'data:font/ttf;base64,' + fs.readFileSync(path.join(FONTS, 'gokschil.ttf')).toString('base64');
const smiley = fs.readFileSync(path.join(ROOT, 'assets', '1e45b3ff62f20ec79a7daa2df025733b.svg'), 'utf8')
  .replace(/ width="\d+" height="\d+"/, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CSS = `
@font-face{font-family:RM;src:url(${font('roboto-mono-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:RM;src:url(${font('roboto-mono-latin-500-normal.woff2')});font-weight:500}
@font-face{font-family:RM;src:url(${font('roboto-mono-latin-700-normal.woff2')});font-weight:700}
@font-face{font-family:WS;src:url(${font('work-sans-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:G;src:url(${goks})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#292929;color:#f2f2f5;font-family:RM,monospace;position:relative}
.wf{position:absolute;right:-150px;top:-40px;width:640px;height:640px}
.bar{position:absolute;left:56px;right:56px;top:48px;display:flex;align-items:center;gap:20px;font-size:24px;padding:16px 24px;border:2px solid #f2f2f5;border-radius:16px;background:#292929}
.dots{display:flex;gap:10px}.dots i{width:16px;height:16px;border-radius:50%;display:block}
.bar b{color:#ffff8d;font-weight:500}.cur{display:inline-block;width:14px;height:26px;background:#f2f2f5;vertical-align:-4px;margin-left:6px}
.txt{position:absolute;left:56px;top:200px;width:760px;display:flex;flex-direction:column;gap:20px}
.k{font-size:22px;font-weight:500;color:#36d6a5;text-transform:uppercase;letter-spacing:.04em}
h1{font-family:G,RM,monospace;font-weight:400;font-size:104px;line-height:.95;text-transform:lowercase}
.s{font-family:WS,sans-serif;font-size:28px;line-height:1.35;white-space:pre-line;color:#f2f2f5;opacity:.85}
.smile{position:absolute;right:96px;top:220px;width:224px;height:224px}
.smile g{fill:#36d6a5}
.tape{position:absolute;left:0;right:0;bottom:56px;height:32px;border-top:2px solid #f2f2f5;border-bottom:2px solid #f2f2f5;background:repeating-linear-gradient(-45deg,#f2f2f5 0 16px,#292929 16px 32px)}
.url{position:absolute;right:56px;bottom:12px;font-size:22px;font-weight:500}
.url::before{content:'→ ';color:#36d6a5}
`;

const WIRE = (() => {
  let s = '<svg class="wf" viewBox="0 0 640 640" fill="none" stroke="#4a4a4a" stroke-width="2" aria-hidden="true">';
  for (let r = 80; r <= 320; r += 60) s += `<circle cx="320" cy="320" r="${r}"/>`;
  for (let a = 0; a < 180; a += 30) {
    const t = (a * Math.PI) / 180, x = Math.cos(t) * 320, y = Math.sin(t) * 320;
    s += `<line x1="${320 - x}" y1="${320 - y}" x2="${320 + x}" y2="${320 + y}"/>`;
  }
  return s + '</svg>';
})();

const page = ([, p, k, t, s]) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
${WIRE}
<div class="bar"><span class="dots"><i style="background:#e97045"></i><i style="background:#ffff8d"></i><i style="background:#b9a6f2"></i></span><span><b>thais@coffee</b>:~/${esc(p)} $<span class="cur"></span></span></div>
<div class="txt"><p class="k">${esc(k)}</p><h1 id="h">${esc(t)}</h1><p class="s">${esc(s)}</p></div>
<div class="smile">${smiley}</div>
<div class="tape"></div><p class="url">thais.coffee</p>
</body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ICONS, { recursive: true });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const row of OG_PAGES) {
    await pg.setContent(page(row), { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    // título cabe em até 3 linhas sem encostar no rodapé
    await pg.evaluate(() => {
      const h = document.getElementById('h'), box = h.parentElement;
      let fs = 104;
      while (fs > 48 && (box.getBoundingClientRect().bottom > 520 || h.scrollWidth > h.clientWidth)) { fs -= 4; h.style.fontSize = fs + 'px'; }
    });
    await pg.screenshot({ path: path.join(OUT, row[0] + '.png') });
    console.log('ok og/' + row[0] + '.png');
  }
  // favicons: smiley escuro sobre o amarelo do site (legível em abas claras e escuras)
  for (const [n, size] of [['favicon-32.png', 32], ['favicon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await pg.setViewportSize({ width: size, height: size });
    await pg.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:#ffff8d;display:flex;align-items:center;justify-content:center">
<div style="width:${Math.round(size * 0.8)}px;height:${Math.round(size * 0.8)}px">${smiley.replace('<svg', '<svg style="width:100%;height:100%"')}</div></body></html>`);
    await pg.screenshot({ path: path.join(ICONS, n) });
    console.log('ok icons/' + n);
  }
  await b.close();
})();
