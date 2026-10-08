// Utilitários de interface: criação de elementos, ícones (traços do Lucide), diálogos e avisos.

const ICONES = {
  hoje: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  funil: '<path d="M6 5v11M12 5v6M18 5v14"/>',
  contatos: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  dados: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  mais: '<path d="M5 12h14M12 5v14"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  whatsapp: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  ligacao: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
  site: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  reuniao: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  visita: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  nota: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  estagio: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  criado: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  lixo: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  enviar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  seta: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  lua: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  termometro: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  ordenar: '<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/>',
  externo: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  pausa: '<circle cx="12" cy="12" r="10"/><path d="M10 15V9M14 15V9"/>',
  trofeu: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};

export function icone(nome, classe = '') {
  const span = document.createElement('span');
  span.className = 'ic ' + classe;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ''}</svg>`;
  return span;
}

/** h('button', { class: 'btn', onclick }, 'Texto', filho) */
export function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  anexar(el, filhos);
  return el;
}

function anexar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export function limpar(el, ...filhos) {
  el.replaceChildren();
  anexar(el, filhos);
  return el;
}

// ---------- avisos ----------
// Com um <dialog> modal aberto, o resto da página fica inerte e atrás do fundo escuro;
// por isso a região de avisos passa a morar dentro do diálogo do topo enquanto ele estiver aberto.
export function devolverAvisos(dlg) {
  const regiao = document.getElementById('avisos');
  if (regiao && dlg.contains(regiao)) {
    const outro = [...document.querySelectorAll('dialog[open]')].filter((d) => d !== dlg).at(-1);
    (outro || document.body).append(regiao);
  }
}

export function aviso(texto, { acao, aoAgir, tempo = 5000, tipo = '' } = {}) {
  const regiao = document.getElementById('avisos');
  const topo = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
  if (regiao.parentElement !== topo) topo.append(regiao);
  const item = h('div', { class: 'aviso ' + tipo },
    h('span', {}, texto),
    acao && h('button', { class: 'aviso-acao', type: 'button', onclick: () => { aoAgir?.(); sair(); } }, acao),
    h('button', { class: 'aviso-fechar', type: 'button', 'aria-label': 'Fechar aviso', onclick: () => sair() }, icone('fechar')),
  );
  let t = setTimeout(sair, tempo);
  item.addEventListener('mouseenter', () => clearTimeout(t));
  item.addEventListener('mouseleave', () => { t = setTimeout(sair, 2500); });
  function sair() {
    clearTimeout(t);
    item.classList.add('saindo');
    setTimeout(() => item.remove(), 160);
  }
  regiao.append(item);
}

// ---------- diálogos ----------
/** Abre um <dialog> modal com conteúdo; resolve com o valor passado a fechar(). */
export function dialogo({ titulo, descricao, corpo, classe = '', rotulo }) {
  return new Promise((resolve) => {
    let valor;
    const fechar = (v) => { valor = v; dlg.close(); };
    const cab = h('header', { class: 'dlg-cab' },
      h('div', {}, h('h2', { class: 'dlg-titulo', id: 'dlg-t' }, titulo), descricao && h('p', { class: 'dlg-desc' }, descricao)),
      h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar', onclick: () => fechar(undefined) }, icone('fechar')),
    );
    const dlg = h('dialog', { class: 'dlg ' + classe, 'aria-labelledby': rotulo || 'dlg-t' }, cab, corpo(fechar));
    dlg.addEventListener('close', () => { devolverAvisos(dlg); dlg.remove(); resolve(valor); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) fechar(undefined); });
    document.body.append(dlg);
    dlg.showModal();
    const primeiro = dlg.querySelector('[autofocus]') || dlg.querySelector('input, select, textarea');
    primeiro?.focus();
  });
}

export function confirmar({ titulo, descricao, ok = 'Confirmar', perigo = false }) {
  return dialogo({
    titulo,
    descricao,
    classe: 'dlg-pequeno',
    corpo: (fechar) => h('div', { class: 'dlg-acoes' },
      h('button', { class: 'btn', type: 'button', onclick: () => fechar(false) }, 'Cancelar'),
      h('button', { class: 'btn ' + (perigo ? 'btn-perigo' : 'btn-primario'), type: 'button', autofocus: true, onclick: () => fechar(true) }, ok),
    ),
  });
}

export function baixarArquivo(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function escolherArquivo(accept) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, style: { display: 'none' } });
    input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

/** Lê texto tentando UTF-8 e caindo para Windows-1252 (planilhas do Excel em português). */
export async function lerTexto(arquivo) {
  const buf = await arquivo.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

/** Campo com rótulo visível. */
export function campo(rotulo, controle, { ajuda, largura = '' } = {}) {
  const id = controle.id || 'f-' + Math.random().toString(36).slice(2, 8);
  controle.id = id;
  const ajudaId = ajuda ? id + '-ajuda' : null;
  if (ajudaId) controle.setAttribute('aria-describedby', ajudaId);
  return h('div', { class: 'campo ' + largura },
    h('label', { for: id }, rotulo),
    controle,
    ajuda && h('p', { class: 'campo-ajuda', id: ajudaId }, ajuda),
  );
}

export function opcoes(lista, atual, vazio) {
  return [
    vazio !== undefined && h('option', { value: '' }, vazio),
    ...lista.map((o) => {
      const [v, t] = typeof o === 'string' ? [o, o] : [o.id, o.nome];
      return h('option', { value: v, selected: v === atual }, t);
    }),
  ];
}
