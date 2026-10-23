/* thais.coffee: runtime das páginas exportadas do canvas.
   Lê o template (<template id="dc-tpl">) e a lógica da página (<script id="dc-logic">),
   e renderiza com React, com a mesma semântica do canvas:
   {{ caminho }}, <sc-for list as>, <sc-if value>, eventos onX="{{ fn }}", setState. */
import React from 'react';
import { createRoot } from 'react-dom/client';

const h = React.createElement;

/* ---------- valores */
function lookup(scope, expr) {
  const e = expr.trim();
  if (e === 'true') return true;
  if (e === 'false') return false;
  if (e === 'null') return null;
  if (e === 'undefined' || e === '') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
  if (/^(['"]).*\1$/.test(e)) return e.slice(1, -1);
  let v = scope;
  for (const k of e.split('.')) {
    if (v == null) return undefined;
    v = v[k];
  }
  return v;
}
const HOLE = /\{\{([\s\S]*?)\}\}/g;
const WHOLE = /^\s*\{\{((?:(?!\{\{|\}\})[\s\S])*)\}\}\s*$/; // um único buraco ocupando tudo
function str(v) { return v == null || v === false ? '' : String(v); }
function interp(text, scope) {
  return text.replace(HOLE, (_, e) => str(lookup(scope, e)));
}
function value(raw, scope) {
  const m = raw.match(WHOLE);
  return m ? lookup(scope, m[1]) : interp(raw, scope);
}

/* ---------- atributos HTML → props do React */
const EVENTS = {};
('Click DoubleClick ContextMenu MouseDown MouseUp MouseEnter MouseLeave MouseMove MouseOver MouseOut ' +
 'PointerDown PointerUp PointerMove PointerEnter PointerLeave PointerCancel PointerOver PointerOut ' +
 'TouchStart TouchMove TouchEnd TouchCancel KeyDown KeyUp KeyPress Focus Blur Change Input Submit Reset Invalid ' +
 'Scroll Wheel DragStart Drag DragEnd DragEnter DragOver DragLeave Drop Load Error AnimationEnd AnimationStart ' +
 'AnimationIteration TransitionEnd Copy Cut Paste Select Toggle')
  .split(' ').forEach((n) => { EVENTS['on' + n.toLowerCase()] = 'on' + n; });
const RENAME = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
  minlength: 'minLength', autocomplete: 'autoComplete', autofocus: 'autoFocus', colspan: 'colSpan',
  rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', spellcheck: 'spellCheck',
  contenteditable: 'contentEditable', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint',
  novalidate: 'noValidate', playsinline: 'playsInline', datetime: 'dateTime', enctype: 'encType',
  'accept-charset': 'acceptCharset', 'http-equiv': 'httpEquiv', referrerpolicy: 'referrerPolicy',
  'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', fetchpriority: 'fetchPriority',
  allowfullscreen: 'allowFullScreen', frameborder: 'frameBorder', usemap: 'useMap'
};
const BOOL = new Set(['hidden', 'disabled', 'checked', 'selected', 'required', 'multiple', 'open', 'autoFocus',
  'readOnly', 'noValidate', 'playsInline', 'muted', 'loop', 'autoPlay', 'controls', 'reversed', 'defer', 'async', 'inert']);

function styleObj(css) {
  if (css && typeof css === 'object') return css;
  const out = {};
  String(css || '').split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k) return;
    const key = k.startsWith('--') ? k : k.toLowerCase().replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^ms([A-Z])/, 'ms$1');
    out[key] = v;
  });
  return out;
}

function propsOf(el, scope, tag) {
  const p = {};
  for (const a of Array.from(el.attributes)) {
    const name = a.name;
    if (name.startsWith('hint-')) continue;
    const v = value(a.value, scope);
    if (EVENTS[name]) { if (typeof v === 'function') p[EVENTS[name]] = v; continue; }
    if (name === 'style') { p.style = styleObj(v); continue; }
    const key = RENAME[name] || name;
    if (BOOL.has(key)) {
      // atributo literal sem valor (hidden="") liga; buraco segue o valor
      p[key] = WHOLE.test(a.value) ? !!v : true;
      continue;
    }
    if (v === undefined || v === null) continue;
    if (key === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
      // valor fixo vira valor inicial (como no HTML); com buraco, fica controlado como no canvas
      if (WHOLE.test(a.value)) p.value = v == null ? '' : v; else p.defaultValue = v;
      continue;
    }
    if (key === 'checked' && tag === 'input') { p.checked = !!v; continue; }
    p[key] = (typeof v === 'boolean' && !name.startsWith('aria-') && !name.startsWith('data-')) ? (v ? '' : undefined) : v;
    if (p[key] === undefined) delete p[key];
  }
  return p;
}

/* ---------- template → elementos */
function kids(node, scope) {
  const out = [];
  node.childNodes.forEach((c) => {
    const r = build(c, scope);
    if (r !== null) out.push(r);
  });
  return out;
}
function build(node, scope) {
  if (node.nodeType === 3) {
    const t = node.nodeValue;
    if (t.indexOf('{{') < 0) return t;
    const m = t.match(WHOLE);
    if (m) {
      const v = lookup(scope, m[1]);
      if (React.isValidElement(v)) return v;
      return t.replace(HOLE, () => str(v));
    }
    return interp(t, scope);
  }
  if (node.nodeType !== 1) return null;
  const tag = node.localName;
  if (tag === 'dc-import') {
    // componente de outro arquivo do canvas (ex.: a simulação do Refin), embutido na página pelo build
    const name = node.getAttribute('name');
    const C = component(name);
    if (!C) return null;
    const props = {};
    for (const a of Array.from(node.attributes)) {
      if (a.name === 'name' || a.name.startsWith('hint-')) continue;
      props[a.name] = value(a.value, scope);
    }
    return h('div', { className: 'dc-import', 'data-name': name }, h(C, props));
  }
  if (tag === 'sc-if') {
    const v = value(node.getAttribute('value') || '', scope);
    return v ? h(React.Fragment, null, ...kids(node, scope)) : null;
  }
  if (tag === 'sc-for') {
    const list = value(node.getAttribute('list') || '', scope);
    const as = node.getAttribute('as') || 'item';
    if (!Array.isArray(list)) return null;
    return list.map((item, i) => {
      const s = Object.create(scope);
      s[as] = item;
      s.$index = i;
      return h(React.Fragment, { key: i }, ...kids(node, s));
    });
  }
  const props = propsOf(node, scope, tag);
  const content = tag === 'template' ? node.content : node;
  if (tag === 'textarea') {
    const t = kids(content, scope).join('');
    if (!('value' in props) && !('defaultValue' in props)) props.defaultValue = t;
    return h(tag, props);
  }
  if (tag === 'style' || tag === 'script') {
    return h(tag, Object.assign(props, { dangerouslySetInnerHTML: { __html: interp(node.textContent, scope) } }));
  }
  const ch = kids(content, scope);
  return ch.length ? h(tag, props, ...ch) : h(tag, props);
}

/* ---------- componente */
class DCLogic extends React.Component {
  constructor(props) { super(props); this.state = this.state || {}; }
  renderVals() { return {}; }
  render() {
    const vals = this.renderVals() || {};
    return h(React.Fragment, null, ...kids(this.constructor.__tpl || DCLogic.__tpl, vals));
  }
}
window.DCLogic = DCLogic;

/* componentes importados: <template id="dc-tpl-Nome"> + <script id="dc-logic-Nome"> */
const COMPS = {};
function component(name) {
  if (!name) return null;
  if (COMPS[name]) return COMPS[name];
  const tpl = document.getElementById('dc-tpl-' + name);
  if (!tpl) return null;
  const logic = document.getElementById('dc-logic-' + name);
  let C = class extends DCLogic {};
  // eslint-disable-next-line no-new-func
  if (logic) C = new Function('DCLogic', 'React', logic.textContent + '\n;return Component;')(DCLogic, React);
  const Comp = class extends C {};
  Comp.__tpl = tpl.content;
  COMPS[name] = Comp;
  return Comp;
}

function boot() {
  const tpl = document.getElementById('dc-tpl');
  const logic = document.getElementById('dc-logic');
  const root = document.getElementById('dc-root');
  if (!tpl || !root) return;
  DCLogic.__tpl = tpl.content;
  let Comp = class extends DCLogic {};
  if (logic) {
    // eslint-disable-next-line no-new-func
    Comp = new Function('DCLogic', 'React', logic.textContent + '\n;return Component;')(DCLogic, React);
  }
  const r = createRoot(root);
  r.render(h(Comp, {}));
  // âncora na URL (ex.: /#grandes-feitos) depois que a página monta
  if (location.hash) {
    setTimeout(() => {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) t.scrollIntoView();
    }, 60);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
