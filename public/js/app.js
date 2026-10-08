// Ponto de entrada: carrega os dados, desenha a tela da rota atual e cuida da ficha lateral.
import * as store from './store.js';
import { h, icone, limpar, confirmar, devolverAvisos } from './ui.js';
import { rotaAtual, irPara, fecharContato } from './nav.js';
import { telaHoje, telaFunil } from './telas-funil.js';
import { telaContatos, telaDados, filtros } from './telas-lista.js';
import { renderGaveta, novoContatoDialogo } from './contato.js';
import { metricas } from './core.js';

const TELAS = { hoje: telaHoje, funil: telaFunil, contatos: telaContatos, dados: telaDados };
const main = document.getElementById('conteudo');
const gaveta = document.getElementById('gaveta');
const corpoGaveta = gaveta.querySelector('.gaveta-corpo');
let rotaDesenhada = null;
let gavetaId = null;
let origemFoco = null;
let agendado = false;

// ---------- tema ----------
function aplicarTema(tema) {
  const t = tema || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = t;
  try { localStorage.setItem('crm.tema', t); } catch { /* sem storage */ }
  const escuro = t === 'escuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const btn = document.getElementById('btn-tema');
  limpar(btn, icone(escuro ? 'sol' : 'lua'));
  btn.setAttribute('aria-label', escuro ? 'Usar tema claro' : 'Usar tema escuro');
  btn.title = btn.getAttribute('aria-label');
}

// ---------- desenho ----------
function desenhar() {
  agendado = false;
  const { rota } = rotaAtual();
  const mudouRota = rota !== rotaDesenhada;

  // preserva rolagem e foco entre redesenhos da mesma tela
  const rolagens = {};
  main.querySelectorAll('[data-rolagem]').forEach((el) => { rolagens[el.dataset.rolagem] = [el.scrollLeft, el.scrollTop]; });
  const y = window.scrollY;
  const ativo = document.activeElement;
  const chaveFoco = main.contains(ativo) ? ativo.getAttribute('aria-label') : null;
  const selecao = chaveFoco && 'selectionStart' in ativo ? [ativo.selectionStart, ativo.selectionEnd] : null;

  limpar(main, TELAS[rota]());

  if (mudouRota) {
    window.scrollTo(0, 0);
    main.querySelector('h1')?.setAttribute('tabindex', '-1');
    if (rotaDesenhada !== null) main.querySelector('h1')?.focus({ preventScroll: true });
    rotaDesenhada = rota;
  } else {
    main.querySelectorAll('[data-rolagem]').forEach((el) => {
      const r = rolagens[el.dataset.rolagem];
      if (r) [el.scrollLeft, el.scrollTop] = r;
    });
    window.scrollTo(0, y);
    if (chaveFoco) {
      const alvo = [...main.querySelectorAll('[aria-label]')].find((el) => el.getAttribute('aria-label') === chaveFoco);
      if (alvo) {
        alvo.focus({ preventScroll: true });
        if (selecao && typeof alvo.setSelectionRange === 'function') { try { alvo.setSelectionRange(...selecao); } catch { /* tipos sem seleção */ } }
      }
    }
  }
  atualizarNav(rota);
}

function agendarDesenho() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(desenhar);
}

function atualizarNav(rota) {
  document.querySelectorAll('.nav a').forEach((a) => {
    if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const m = metricas(store.obter().contatos);
  const pendentes = m.atrasados + m.paraHoje;
  const selo = document.querySelector('.nav a[data-rota="hoje"] .nav-selo');
  selo.textContent = pendentes ? String(pendentes) : '';
  selo.hidden = !pendentes;
  selo.setAttribute('aria-label', `${pendentes} follow-ups para hoje`);
  selo.classList.toggle('alerta', m.atrasados > 0);
}

// ---------- ficha lateral ----------
function sincronizarGaveta() {
  const { contato, foco } = rotaAtual();
  if (contato) {
    if (!gaveta.open) {
      origemFoco = document.activeElement;
      gaveta.showModal();
    }
    const mudou = contato !== gavetaId;
    gavetaId = contato;
    renderGaveta(corpoGaveta, contato, foco);
    if (mudou) corpoGaveta.querySelector('.gaveta-rolagem')?.scrollTo(0, 0);
    if (foco === 'registrar') {
      requestAnimationFrame(() => {
        const alvo = corpoGaveta.querySelector('#sec-registrar');
        alvo?.scrollIntoView({ block: 'start' });
        alvo?.parentElement.querySelector('textarea')?.focus({ preventScroll: true });
      });
    } else if (mudou) {
      corpoGaveta.querySelector('.gaveta-cab .btn-icone')?.focus();
    }
  } else if (gaveta.open) {
    gavetaId = null;
    gaveta.close();
  }
}

gaveta.addEventListener('close', () => {
  devolverAvisos(gaveta);
  gavetaId = null;
  if (rotaAtual().contato) fecharContato();
  if (origemFoco && document.contains(origemFoco)) origemFoco.focus({ preventScroll: true });
  origemFoco = null;
});
gaveta.addEventListener('click', (e) => { if (e.target === gaveta) gaveta.close(); });

// ---------- eventos ----------
window.addEventListener('hashchange', () => { agendarDesenho(); sincronizarGaveta(); });
document.addEventListener('crm:render', agendarDesenho);
document.addEventListener('crm:contato', (e) => {
  if (!gaveta.open || e.detail !== gavetaId) return;
  const focoDentro = corpoGaveta.contains(document.activeElement) || document.activeElement === document.body;
  renderGaveta(corpoGaveta, gavetaId);
  if (focoDentro) (corpoGaveta.querySelector('.passo.atual button') || corpoGaveta.querySelector('.gaveta-cab .btn-icone'))?.focus({ preventScroll: true });
});
document.addEventListener('crm:substituido', () => { if (gaveta.open && gavetaId) renderGaveta(corpoGaveta, gavetaId); });
document.addEventListener('crm:filtrar', (e) => {
  Object.assign(filtros, { termo: '', estagio: 'ativos', temperatura: '', segmento: '', cidade: '', origem: '', followup: '' }, e.detail);
  if (rotaAtual().rota === 'contatos') agendarDesenho(); else irPara('contatos');
});
document.addEventListener('crm:tema', (e) => aplicarTema(e.detail));
document.addEventListener('crm:conflito', async () => {
  const ok = await confirmar({
    titulo: 'Os dados mudaram em outra janela',
    descricao: 'O CRM está aberto em outra aba ou janela e ela salvou alterações. Recarregue para ver a versão mais recente (a última alteração desta aba não foi gravada).',
    ok: 'Recarregar agora',
  });
  if (ok) location.reload();
});
store.aoMudar(agendarDesenho);

document.getElementById('btn-novo').addEventListener('click', () => novoContatoDialogo());
document.getElementById('btn-tema').addEventListener('click', () => {
  const escuro = document.documentElement.dataset.tema === 'escuro'
    || (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
  aplicarTema(escuro ? 'claro' : 'escuro');
  if (rotaAtual().rota === 'dados') agendarDesenho();
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  const alvo = e.target;
  if (alvo.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); novoContatoDialogo(); }
  if (e.key === '/') {
    e.preventDefault();
    const focar = () => main.querySelector('.busca-lista')?.focus();
    if (rotaAtual().rota === 'contatos') focar();
    else { irPara('contatos'); setTimeout(focar, 60); }
  }
});

store.aoStatus(({ estado, msg }) => {
  const el = document.getElementById('status');
  el.dataset.estado = estado;
  el.querySelector('.status-texto').textContent = msg;
});

// ---------- início ----------
let temaSalvo = 'auto';
try { temaSalvo = localStorage.getItem('crm.tema') || 'auto'; } catch { /* sem storage */ }
aplicarTema(temaSalvo);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema(document.documentElement.dataset.tema || 'auto'));

try {
  await store.carregar();
  desenhar();
  sincronizarGaveta();
} catch {
  limpar(main, h('div', { class: 'tela' }, h('div', { class: 'cartao erro-inicio' },
    icone('alerta', 'vazio-ic'),
    h('h1', { class: 'tela-titulo' }, 'O servidor do CRM não está rodando'),
    h('p', {}, 'Abra o arquivo ', h('code', {}, 'iniciar.bat'), ' na pasta ', h('code', {}, 'crm-vetta'), ' (ou rode ', h('code', {}, 'node server.js'), ') e recarregue esta página.'),
    h('button', { class: 'btn btn-primario', type: 'button', onclick: () => location.reload() }, 'Tentar de novo'),
  )));
}
