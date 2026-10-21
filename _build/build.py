#!/usr/bin/env python3
"""Converte as páginas do canvas "in prod · trabalho" (.dc.html) em páginas do site.

Uso: python3 _build/build.py <pasta com os .dc.html do canvas>

Cada página vira um index.html com:
- o <helmet> do canvas no <head> (fontes e estilos),
- o template em <template id="dc-tpl"> e a lógica em <script id="dc-logic">,
- /assets/dc.js, que renderiza tudo com a mesma lógica do canvas.
Depois rode _build/prerender.js para gravar o HTML já renderizado (SEO e primeira pintura).
"""
import os, re, sys, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
VER = os.environ.get('SITE_VER', '1')

SITE = 'https://thais.coffee'
PAGES = {
    'Prod.dc.html': ('/', 'thais castro · product designer',
                     'Portfólio de Thais Castro, product designer de crédito e fintech.'),
    'Portfolio.dc.html': ('/portfolio/', 'portfólio · thais castro',
                          'Cases de Thais Castro: do problema ao número que eles moveram.'),
    'Case-Transparencia.dc.html': ('/cases/transparencia/', 'transparência como regra de produto · case · thais castro',
                                   'Case: como transparência, segurança e clareza viraram regras de tela nos produtos de crédito.'),
    'Case-Portfolio-IA.dc.html': ('/cases/este-portfolio/', 'este portfólio, feito com ia · case · thais castro',
                                  'Case: como Thais Castro desenhou, escreveu e publicou este portfólio usando IA como parceira de produção.'),
    'Case-Refin-vuhc.dc.html': ('/cases/refinanciamento-em-dia/', 'refinanciamento em dia · case · thais castro',
                                'Case: como bons pagadores passaram a ajustar o próprio empréstimo antes de atrasar.'),
    'Case-Lembrete-s1ny.dc.html': ('/cases/lembrete-de-pagamento/', 'lembrete de pagamento · case · thais castro',
                                   'Case: a mensagem certa, na hora certa, derrubou o saldo em atraso em 64,7%.'),
    'Opinioes-Lista.dc.html': ('/opiniao/', 'opinião · thais castro',
                               'Textos de Thais Castro sobre design de produto, dados, processo e IA.'),
    'Opinioes.dc.html': ('/opiniao/ia/', 'ia não faz bons designers · thais castro',
                         'Opinião de Thais Castro sobre IA, processo e design de produto.'),
    'Opiniao-Conteudo-Dados.dc.html': ('/opiniao/conteudo-e-dados/', 'content designer também abre planilha · thais castro',
                                       'Opinião de Thais Castro sobre como content designers podem trabalhar com dados e levar métricas para seus estudos de caso.'),
    'Opiniao-Roadmap.dc.html': ('/opiniao/roadmap/', 'ninguém me chamou pra mesa do roadmap · thais castro',
                                'Opinião de Thais Castro sobre dados, discovery e como conquistar espaço no roadmap.'),
    'Contato.dc.html': ('/contato/', 'contato · thais castro', 'Fale com Thais Castro, product designer.'),
}
# links do canvas que apontam para versões antigas das mesmas páginas
ALIAS = {'Case-Refin.dc.html': '/cases/refinanciamento-em-dia/',
         'Case-Lembrete.dc.html': '/cases/lembrete-de-pagamento/'}
HREF = {k: v[0] for k, v in PAGES.items()}
HREF.update(ALIAS)

ASSETS = {os.path.splitext(f)[0]: f for f in os.listdir(os.path.join(ROOT, 'assets'))
          if re.match(r'^[0-9a-f]{32}\.', f)}


def rewrite(s, name):
    def blob(m):
        f = ASSETS.get(m.group(1))
        if not f:
            sys.exit(f'{name}: imagem /_blob/{m.group(1)} não está em /assets')
        return '/assets/' + f
    s = re.sub(r'/_blob/([0-9a-f]{32})', blob, s)

    def link(m):
        target, frag = m.group(1), m.group(2) or ''
        base = os.path.basename(target)
        if base not in HREF:
            sys.exit(f'{name}: link para {target} sem página correspondente no site')
        return HREF[base] + frag
    # caminhos de página do canvas, em atributos e dentro da lógica
    s = re.sub(r'(?<![\w/.-])((?:\./|/)?[A-Za-z0-9_-]+\.dc\.html)(#[\w-]+)?', link, s)
    return s


CONTATO_SUBMIT_OLD = "if (valid) this.setState({ sent: true, tried: false });"
CONTATO_SUBMIT_NEW = (
    "if (valid) { const f = e.target; this.setState({ tried: false, sending: true, failed: false });"
    " fetch('/contato/enviar.php', { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })"
    ".then((r) => { if (!r.ok) throw new Error(r.status); this.setState({ sent: true, sending: false }); f.reset(); })"
    ".catch(() => this.setState({ sending: false, failed: true })); }")
HONEYPOT = ('<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">'
            '<label for="f-site">não preencha</label><input id="f-site" name="site" type="text" tabindex="-1" autocomplete="off"></div>'
            '<sc-if value="{{ failed }}"><p role="alert" style="margin: 0; display: flex; align-items: center; gap: 8px; font-size: 14px;">'
            '<span aria-hidden="true" style="display: inline-block; width: 8px; height: 8px; background: #e97045;"></span>'
            'Não consegui enviar agora. Tenta de novo em alguns minutos?</p></sc-if>')


def contato(tpl, js):
    """O canvas só simula o envio; no site o formulário manda e-mail de verdade (contato/enviar.php)."""
    assert CONTATO_SUBMIT_OLD in js, 'contato: lógica de envio mudou no canvas, revisar build.py'
    js = js.replace(CONTATO_SUBMIT_OLD, CONTATO_SUBMIT_NEW)
    js = js.replace("sent: this.state.sent,", "sent: this.state.sent, failed: !!this.state.failed, sending: !!this.state.sending,")
    assert 'failed: !!this.state.failed' in js
    tpl, n = re.subn(r'<form onSubmit="\{\{ submit \}\}"', '<form onSubmit="{{ submit }}" action="/contato/enviar.php" method="post" novalidate', tpl)
    assert n == 1
    tpl, n = re.subn(r'(<textarea id="f-msg"[^>]*></textarea>\s*</div>)', r'\1' + HONEYPOT, tpl)
    assert n == 1, 'contato: não achei o campo de mensagem'
    return tpl, js


def convert(name):
    url, title, desc = PAGES[name]
    s = open(os.path.join(SRC, name), encoding='utf-8').read()
    m = re.search(r'<x-dc>(.*)</x-dc>', s, re.S)
    body = m.group(1)
    hm = re.search(r'<helmet>(.*?)</helmet>', body, re.S)
    helmet = hm.group(1).strip() if hm else ''
    tpl = body[:hm.start()] + body[hm.end():] if hm else body
    js = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S).group(1)
    if name == 'Contato.dc.html':
        tpl, js = contato(tpl, js)
    helmet, tpl, js = (rewrite(x, name) for x in (helmet, tpl, js))
    assert '</script' not in js.lower() and '</template' not in tpl.lower()
    canon = SITE + url
    out = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:type" content="website">
<link rel="icon" href="/assets/1e45b3ff62f20ec79a7daa2df025733b.svg" type="image/svg+xml">
<style>html,body{{overflow-x:clip}}</style>
{helmet}
</head>
<body>
<div id="dc-root"><!--prerender--></div>
<template id="dc-tpl">{tpl}</template>
<script type="text/plain" id="dc-logic">{js}</script>
<script src="/assets/dc.js?v={VER}"></script>
</body>
</html>
'''
    dest = os.path.join(ROOT, url.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(out)
    return dest


def redirect(old, new, label):
    dest = os.path.join(ROOT, old.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>{html.escape(label)} · thais castro</title>
<meta http-equiv="refresh" content="0; url={new}">
<link rel="canonical" href="{SITE}{new}">
<meta name="robots" content="noindex">
</head>
<body><a href="{new}">ir para {html.escape(label)}</a></body>
</html>
''')


if __name__ == '__main__':
    for n in PAGES:
        print('ok', convert(n).replace(ROOT, ''))
    # a seção virou "opinião": os endereços antigos continuam funcionando
    redirect('/opinioes/', '/opiniao/', 'opinião')
    redirect('/opinioes/ia/', '/opiniao/ia/', 'ia não faz bons designers')
    redirect('/opinioes/conteudo-e-dados/', '/opiniao/conteudo-e-dados/', 'content designer também abre planilha')
    redirect('/opinioes/roadmap/', '/opiniao/roadmap/', 'ninguém me chamou pra mesa do roadmap')
