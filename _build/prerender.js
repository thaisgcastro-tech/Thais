// Abre cada página num Chromium, espera o runtime montar e grava o HTML renderizado
// dentro de #dc-root (o runtime substitui pelo vivo ao carregar).
// Uso: node _build/prerender.js [--check]   (--check só lista erros, não grava)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['/', '/portfolio/', '/cases/transparencia/', '/cases/este-portfolio/', '/cases/refinanciamento-em-dia/',
  '/cases/lembrete-de-pagamento/', '/opiniao/', '/opiniao/ia/', '/opiniao/conteudo-e-dados/', '/opiniao/roadmap/', '/contato/'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.json': 'application/json', '.gif': 'image/gif' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const check = process.argv.includes('--check');
  await new Promise((r) => server.listen(8765, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let bad = 0;
  for (const u of PAGES) {
    const errs = [];
    const onErr = (e) => errs.push('pageerror: ' + e.message);
    const onCon = (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); };
    const onRes = (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); };
    page.on('pageerror', onErr); page.on('console', onCon); page.on('response', onRes);
    // páginas externas (fontes do Google) ficam de fora no ambiente de build
    await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await page.goto('http://localhost:8765' + u, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const htmlOut = await page.evaluate(() => document.getElementById('dc-root').innerHTML);
    const len = htmlOut.length;
    page.off('pageerror', onErr); page.off('console', onCon); page.off('response', onRes);
    await page.unroute(/^https?:\/\/(?!localhost)/);
    const real = errs.filter((e) => !/net::ERR_FAILED|ERR_BLOCKED|fonts\.g/.test(e));
    console.log((real.length ? 'ERRO ' : 'ok   ') + u + '  ' + len + ' chars' + (real.length ? '\n   ' + real.join('\n   ') : ''));
    if (real.length || len < 500) bad++;
    if (!check && len > 500) {
      const f = path.join(ROOT, u, 'index.html');
      const src = fs.readFileSync(f, 'utf8');
      // função de substituição: o HTML tem "R$" e afins, que numa string de substituição viram padrões ($`, $&…)
      const out = src.replace(/<div id="dc-root">[\s\S]*?<\/div>\n<template id="dc-tpl">/, () => '<div id="dc-root">' + htmlOut + '</div>\n<template id="dc-tpl">');
      if ((out.match(/<template id="dc-tpl">/g) || []).length !== 1) throw new Error('pré-render corrompeu ' + u);
      fs.writeFileSync(f, out);
    }
  }
  await browser.close();
  server.close();
  process.exit(bad ? 1 : 0);
})();
