// Peças visuais reutilizadas pelas telas.
import { h, icone } from './ui.js';
import {
  ESTAGIO, situacaoFollowUp, formatarData, formatarRelativo, linkWhatsApp, linkInstagram, linkSite, diaISO, nomeExibicao,
} from './core.js';

export function chipEstagio(id) {
  return h('span', { class: 'chip-estagio', dataset: { estagio: id } }, h('span', { class: 'ponto', 'aria-hidden': 'true' }), ESTAGIO[id].nome);
}

export function seloTemperatura(t) {
  if (!t) return null;
  const nome = { fria: 'Fria', morna: 'Morna', quente: 'Quente' }[t];
  return h('span', { class: 'temp', dataset: { t }, title: 'Temperatura do lead' }, icone('termometro'), nome);
}

export function seloFollowUp(c, hoje = diaISO()) {
  const s = situacaoFollowUp(c, hoje);
  const data = c.proximaAcao?.data;
  if (s === 'encerrado') return null;
  if (s === 'sem') return h('span', { class: 'follow sem' }, 'Sem próximo passo');
  if (s === 'atrasado') return h('span', { class: 'follow atrasado' }, icone('alerta'), 'Atrasado · ', formatarData(data));
  if (s === 'hoje') return h('span', { class: 'follow hoje' }, icone('relogio'), 'Hoje');
  return h('span', { class: 'follow' }, icone('relogio'), formatarRelativo(data));
}

export function linksRapidos(c, { compacto = false } = {}) {
  const itens = [];
  const nome = nomeExibicao(c);
  const wa = linkWhatsApp(c.telefone);
  if (wa) itens.push(['whatsapp', wa, `WhatsApp de ${nome}`, 'WhatsApp']);
  if (c.telefone && !compacto) itens.push(['ligacao', 'tel:' + c.telefone.replace(/[^\d+]/g, ''), `Ligar para ${nome}`, 'Ligar']);
  if (c.email && !compacto) itens.push(['email', 'mailto:' + c.email, `E-mail para ${nome}`, 'E-mail']);
  const ig = linkInstagram(c.instagram);
  if (ig) itens.push(['instagram', ig, `Instagram de ${nome}`, 'Instagram']);
  const site = linkSite(c.site);
  if (site && !compacto) itens.push(['site', site, `Site de ${nome}`, 'Site']);
  if (!itens.length) return null;
  return h('div', { class: 'links-rapidos' + (compacto ? ' compacto' : '') },
    itens.map(([ic, href, rotulo, texto]) => h('a', {
      class: compacto ? 'btn-icone' : 'btn btn-suave',
      href,
      target: href.startsWith('http') ? '_blank' : null,
      rel: 'noopener',
      'aria-label': rotulo,
      title: rotulo,
      onclick: (e) => e.stopPropagation(),
    }, icone(ic), !compacto && texto)),
  );
}

export function vazio({ icone: ic, titulo, texto, acoes = [] }) {
  return h('div', { class: 'vazio' },
    ic && icone(ic, 'vazio-ic'),
    h('p', { class: 'vazio-titulo' }, titulo),
    texto && h('p', { class: 'vazio-texto' }, texto),
    acoes.length > 0 && h('div', { class: 'vazio-acoes' }, acoes),
  );
}
