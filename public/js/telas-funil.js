// Telas "Hoje" (painel de follow-ups e métricas) e "Funil" (kanban por estágio).
import { h, icone } from './ui.js';
import * as store from './store.js';
import {
  ESTAGIOS, ESTAGIO, CAMINHO, DIAS_PARADO, metricas, funil, atividadePorSemana, situacaoFollowUp, parado, ativo,
  diaISO, formatarMoeda, formatarData, formatarRelativo, nomeExibicao, ordenar, diasSemContato, filtrar, valoresUnicos,
} from './core.js';
import { chipEstagio, seloTemperatura, seloFollowUp, linksRapidos, vazio } from './componentes.js';
import { abrirContato, irPara } from './nav.js';
import { moverEstagio, novoContatoDialogo } from './contato.js';
import { importarDialogo } from './importar.js';
import { carregarExemplos } from './exemplos.js';

function saudacao(d = new Date()) {
  const hr = d.getHours();
  return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function boasVindas() {
  return h('div', { class: 'tela' },
    h('div', { class: 'boas-vindas cartao' },
      h('p', { class: 'eyebrow' }, 'CRM Auge Lab'),
      h('h1', { class: 'bv-titulo' }, 'Organize a prospecção e acompanhe cada contato até o fechamento.'),
      h('ol', { class: 'bv-passos' },
        h('li', {}, h('strong', {}, 'Cadastre'), ' os negócios que você quer abordar — um a um ou importando uma planilha.'),
        h('li', {}, h('strong', {}, 'Registre'), ' cada conversa (WhatsApp, ligação, Direct, reunião) e defina o próximo passo.'),
        h('li', {}, h('strong', {}, 'Acompanhe'), ' a evolução no funil e os follow-ups do dia nesta tela.'),
      ),
      h('div', { class: 'vazio-acoes' },
        h('button', { class: 'btn btn-primario', type: 'button', onclick: () => novoContatoDialogo() }, icone('mais'), 'Adicionar contato'),
        h('button', { class: 'btn', type: 'button', onclick: () => importarDialogo() }, icone('enviar'), 'Importar planilha'),
        h('button', { class: 'btn btn-suave', type: 'button', onclick: carregarExemplos }, 'Explorar com dados de exemplo'),
      ),
    ),
  );
}

// ---------- HOJE ----------
function linhaAgenda(c, hoje) {
  return h('li', { class: 'linha-contato' },
    h('div', { class: 'lc-principal' },
      h('button', { class: 'lc-abrir', type: 'button', onclick: () => abrirContato(c.id) },
        h('span', { class: 'lc-nome' }, nomeExibicao(c)),
        h('span', { class: 'lc-sub' }, c.proximaAcao?.texto || 'Sem descrição do próximo passo'),
      ),
      h('div', { class: 'lc-meta' }, chipEstagio(c.estagio), seloFollowUp(c, hoje)),
    ),
    h('div', { class: 'lc-acoes' },
      linksRapidos(c, { compacto: true }),
      h('button', { class: 'btn btn-suave', type: 'button', onclick: () => abrirContato(c.id, 'registrar') }, 'Registrar'),
    ),
  );
}

function grupoAgenda(titulo, lista, hoje, classe = '') {
  if (!lista.length) return null;
  return h('div', { class: 'agenda-grupo ' + classe },
    h('h3', { class: 'agenda-titulo' }, titulo, h('span', { class: 'contagem' }, lista.length)),
    h('ul', { class: 'lista-linhas' }, lista.map((c) => linhaAgenda(c, hoje))),
  );
}

function kpi({ rotulo, valor, detalhe, tom = '', extra }) {
  return h('div', { class: 'kpi ' + tom }, h('p', { class: 'kpi-rotulo' }, rotulo), h('p', { class: 'kpi-valor' }, valor), detalhe && h('p', { class: 'kpi-detalhe' }, detalhe), extra);
}

function graficoSemanas(semanas, meta) {
  const L = 320, A = 132, topo = 18, base = A - 22;
  const maximo = Math.max(meta || 0, ...semanas.map((s) => s.total), 1);
  const passo = L / semanas.length;
  const larg = Math.min(26, passo * 0.6);
  const y = (v) => base - (v / maximo) * (base - topo);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${L} ${A}`);
  svg.setAttribute('class', 'grafico');
  svg.setAttribute('role', 'img');
  const atual = semanas[semanas.length - 1];
  svg.setAttribute('aria-label', `Contatos feitos por semana nas últimas ${semanas.length} semanas: ${semanas.map((s) => `semana de ${formatarData(s.inicio)}, ${s.total}`).join('; ')}. Meta semanal: ${meta}. Esta semana: ${atual.total}.`);
  let partes = `<line x1="0" x2="${L}" y1="${base}" y2="${base}" class="g-eixo"/>`;
  if (meta) partes += `<line x1="0" x2="${L}" y1="${y(meta)}" y2="${y(meta)}" class="g-meta"/><text x="${L}" y="${y(meta) - 4}" text-anchor="end" class="g-meta-txt">meta ${meta}</text>`;
  semanas.forEach((s, i) => {
    const cx = passo * i + passo / 2;
    const alt = Math.max(s.total ? 2 : 0, base - y(s.total));
    const ult = i === semanas.length - 1;
    partes += `<rect x="${cx - larg / 2}" y="${base - alt}" width="${larg}" height="${alt}" rx="3" class="g-barra${ult ? ' atual' : ''}"/>`;
    partes += `<text x="${cx}" y="${base - alt - 4}" text-anchor="middle" class="g-valor">${s.total}</text>`;
    const [, m, d] = s.inicio.split('-');
    partes += `<text x="${cx}" y="${A - 6}" text-anchor="middle" class="g-rotulo">${ult ? 'esta' : `${d}/${m}`}</text>`;
  });
  svg.innerHTML = partes;
  return svg;
}

export function telaHoje() {
  const db = store.obter();
  const cs = db.contatos;
  if (!cs.length) return boasVindas();
  const agora = new Date();
  const hoje = diaISO(agora);
  const m = metricas(cs, agora);
  const ativos = cs.filter(ativo);
  const porData = (s) => ordenar(ativos.filter((c) => situacaoFollowUp(c, hoje) === s), 'proximaAcao');
  const atrasados = porData('atrasado'), deHoje = porData('hoje'), semana = porData('semana');
  const semProximo = ordenar(ativos.filter((c) => situacaoFollowUp(c, hoje) === 'sem'), 'temperatura');
  const parados = ativos.filter((c) => parado(c, agora)).sort((a, b) => diasSemContato(b, agora) - diasSemContato(a, agora));
  const semanas = atividadePorSemana(cs, agora, 8);
  const meta = Number(db.ajustes.metaContatosSemana) || 0;
  const estaSemana = semanas[semanas.length - 1].total;

  const resumo = [];
  if (atrasados.length) resumo.push(plural(atrasados.length, 'follow-up atrasado', 'follow-ups atrasados'));
  if (deHoje.length) resumo.push(plural(deHoje.length, 'para hoje', 'para hoje'));
  const textoResumo = resumo.length ? resumo.join(' e ') + '.' : 'Nenhum follow-up pendente para hoje.';

  const f = funil(cs);
  const topo = Math.max(1, f[0].chegaram);
  const motivos = Object.entries(cs.filter((c) => c.estagio === 'perdido').reduce((acc, c) => {
    const k = (c.motivoPerda || 'Sem motivo').split(' — ')[0];
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const pct = meta ? Math.min(100, Math.round((estaSemana / meta) * 100)) : 0;

  return h('div', { class: 'tela' },
    h('header', { class: 'tela-cab' },
      h('div', {},
        h('p', { class: 'eyebrow' }, agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })),
        h('h1', { class: 'tela-titulo' }, saudacao(agora)),
        h('p', { class: 'tela-resumo' }, textoResumo),
      ),
    ),
    h('section', { class: 'kpis', 'aria-label': 'Resumo' },
      kpi({ rotulo: 'Follow-ups para hoje', valor: String(atrasados.length + deHoje.length), detalhe: atrasados.length ? plural(atrasados.length, 'atrasado', 'atrasados') : 'Nada atrasado', tom: atrasados.length ? 'alerta' : '' }),
      kpi({
        rotulo: 'Contatos esta semana', valor: meta ? `${estaSemana}/${meta}` : String(estaSemana), detalhe: `${m.contatosMes} no mês`,
        extra: meta ? h('div', { class: 'progresso', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': meta, 'aria-valuenow': estaSemana, 'aria-label': 'Meta semanal de contatos' }, h('span', { style: { width: pct + '%' } })) : null,
      }),
      kpi({ rotulo: 'Em aberto no funil', valor: formatarMoeda(m.pipeline), detalhe: `${plural(m.ativos, 'lead ativo', 'leads ativos')} · ${m.emProposta} em proposta` }),
      kpi({ rotulo: 'Fechados no mês', valor: String(m.ganhosMes), detalhe: `${formatarMoeda(m.receitaMes)}${m.conversao !== null ? ` · conversão ${Math.round(m.conversao * 100)}%` : ''}`, tom: m.ganhosMes ? 'sucesso' : '' }),
    ),
    h('div', { class: 'painel-grade' },
      h('section', { class: 'cartao', 'aria-labelledby': 'agenda-t' },
        h('div', { class: 'cartao-cab' }, h('h2', { class: 'cartao-titulo', id: 'agenda-t' }, 'Agenda de follow-ups'),
          h('button', { class: 'btn btn-suave', type: 'button', onclick: () => novoContatoDialogo() }, icone('mais'), 'Contato')),
        atrasados.length + deHoje.length + semana.length === 0
          ? vazio({ icone: 'check', titulo: 'Agenda limpa', texto: 'Nenhum follow-up nos próximos 7 dias. Que tal abordar leads novos?', acoes: [h('button', { class: 'btn', type: 'button', onclick: () => irPara('funil') }, 'Ver funil')] })
          : [grupoAgenda('Atrasados', atrasados, hoje, 'atrasados'), grupoAgenda('Hoje', deHoje, hoje), grupoAgenda('Próximos 7 dias', semana, hoje)],
      ),
      h('div', { class: 'coluna-lateral' },
        h('section', { class: 'cartao', 'aria-labelledby': 'atencao-t' },
          h('div', { class: 'cartao-cab' }, h('h2', { class: 'cartao-titulo', id: 'atencao-t' }, 'Precisam de atenção')),
          !semProximo.length && !parados.length
            ? h('p', { class: 'mudo pad-v' }, 'Todos os leads ativos têm próximo passo e contato recente.')
            : [
              semProximo.length > 0 && h('div', { class: 'atencao-grupo' },
                h('h3', { class: 'agenda-titulo' }, 'Sem próximo passo', h('span', { class: 'contagem' }, semProximo.length)),
                h('ul', { class: 'lista-mini' }, semProximo.slice(0, 5).map((c) => h('li', {},
                  h('button', { class: 'mini-abrir', type: 'button', onclick: () => abrirContato(c.id) }, h('span', {}, nomeExibicao(c)), chipEstagio(c.estagio))))),
                semProximo.length > 5 && h('a', { class: 'link', href: '#/contatos?' , onclick: (e) => { e.preventDefault(); document.dispatchEvent(new CustomEvent('crm:filtrar', { detail: { followup: 'sem', estagio: 'ativos' } })); } }, `Ver todos (${semProximo.length})`),
              ),
              parados.length > 0 && h('div', { class: 'atencao-grupo' },
                h('h3', { class: 'agenda-titulo' }, `Sem contato há ${DIAS_PARADO}+ dias`, h('span', { class: 'contagem' }, parados.length)),
                h('ul', { class: 'lista-mini' }, parados.slice(0, 5).map((c) => h('li', {},
                  h('button', { class: 'mini-abrir', type: 'button', onclick: () => abrirContato(c.id) }, h('span', {}, nomeExibicao(c)), h('span', { class: 'mudo' }, `${diasSemContato(c, agora)} dias`))))),
              ),
            ],
        ),
        h('section', { class: 'cartao', 'aria-labelledby': 'funil-t' },
          h('div', { class: 'cartao-cab' }, h('h2', { class: 'cartao-titulo', id: 'funil-t' }, 'Até onde os leads chegaram'),
            h('a', { class: 'link', href: '#/funil' }, 'Abrir funil')),
          h('ul', { class: 'barras-funil' }, f.map((e) => h('li', { dataset: { estagio: e.id } },
            h('span', { class: 'bf-nome' }, e.nome),
            h('span', { class: 'bf-trilho', 'aria-hidden': 'true' }, h('span', { class: 'bf-barra', style: { width: `${(e.chegaram / topo) * 100}%` } })),
            h('span', { class: 'bf-num' }, e.chegaram, h('span', { class: 'mudo' }, ` · ${Math.round((e.chegaram / topo) * 100)}%`)),
          ))),
          h('p', { class: 'nota-rodape' }, `${plural(m.perdidos, 'perdido', 'perdidos')}`, motivos.length ? ` · principal motivo: ${motivos[0][0].toLowerCase()}` : ''),
        ),
        h('section', { class: 'cartao', 'aria-labelledby': 'semana-t' },
          h('div', { class: 'cartao-cab' }, h('h2', { class: 'cartao-titulo', id: 'semana-t' }, 'Contatos feitos por semana')),
          graficoSemanas(semanas, meta),
          h('p', { class: 'nota-rodape' }, 'Conta WhatsApp, ligações, e-mails, Directs, reuniões e visitas registrados (anotações não entram).'),
        ),
      ),
    ),
  );
}

// ---------- FUNIL ----------
const filtroFunil = { temperatura: '', segmento: '', encerrados: true };

function cartaoKanban(c, hoje) {
  const i = CAMINHO.indexOf(c.estagio);
  const proximo = ativo(c) ? CAMINHO[i + 1] : null;
  const card = h('li', { class: 'card', draggable: 'true', dataset: { id: c.id, t: c.temperatura } },
    h('button', { class: 'card-abrir', type: 'button', onclick: () => abrirContato(c.id) }, nomeExibicao(c)),
    h('p', { class: 'card-sub' }, [c.pessoa && c.empresa ? c.pessoa : '', c.segmento, c.cidade].filter(Boolean).join(' · ') || '—'),
    ativo(c) && c.proximaAcao?.texto && h('p', { class: 'card-proximo' }, c.proximaAcao.texto),
    h('div', { class: 'card-meta' }, seloTemperatura(c.temperatura), seloFollowUp(c, hoje),
      c.estagio === 'perdido' && c.motivoPerda && h('span', { class: 'mudo card-motivo' }, c.motivoPerda),
      c.estagio === 'ganho' && h('span', { class: 'mudo' }, formatarRelativo(c.estagioDesde))),
    h('div', { class: 'card-rodape' },
      h('span', { class: 'card-valor' }, c.valor ? formatarMoeda(c.valor) : ''),
      h('div', { class: 'card-acoes' },
        linksRapidos(c, { compacto: true }),
        proximo && h('button', {
          class: 'btn-icone', type: 'button', title: `Avançar para ${ESTAGIO[proximo].nome}`,
          'aria-label': `Avançar ${nomeExibicao(c)} para ${ESTAGIO[proximo].nome}`,
          onclick: () => moverEstagio(c.id, proximo),
        }, icone('seta')),
      ),
    ),
  );
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', c.id);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => card.classList.add('arrastando'));
  });
  card.addEventListener('dragend', () => card.classList.remove('arrastando'));
  return card;
}

export function telaFunil() {
  const db = store.obter();
  if (!db.contatos.length) return boasVindas();
  const hoje = diaISO();
  const cs = filtrar(db.contatos, { temperatura: filtroFunil.temperatura, segmento: filtroFunil.segmento });
  const estagios = ESTAGIOS.filter((e) => filtroFunil.encerrados || (e.id !== 'ganho' && e.id !== 'perdido'));
  const ativos = cs.filter(ativo);
  const rerender = () => document.dispatchEvent(new CustomEvent('crm:render'));

  const selTemp = h('select', { 'aria-label': 'Filtrar por temperatura', onchange: (e) => { filtroFunil.temperatura = e.target.value; rerender(); } },
    h('option', { value: '' }, 'Todas as temperaturas'),
    ['quente', 'morna', 'fria'].map((t) => h('option', { value: t, selected: filtroFunil.temperatura === t }, t[0].toUpperCase() + t.slice(1))));
  const selSeg = h('select', { 'aria-label': 'Filtrar por segmento', onchange: (e) => { filtroFunil.segmento = e.target.value; rerender(); } },
    h('option', { value: '' }, 'Todos os segmentos'),
    valoresUnicos(db.contatos, 'segmento').map((s) => h('option', { value: s, selected: filtroFunil.segmento === s }, s)));

  const colunas = estagios.map((e) => {
    const lista = ordenar(cs.filter((c) => c.estagio === e.id), e.id === 'ganho' || e.id === 'perdido' ? 'ultimoContato' : 'proximaAcao', e.id === 'ganho' || e.id === 'perdido' ? 'desc' : 'asc');
    const soma = lista.reduce((s, c) => s + (Number(c.valor) || 0), 0);
    const col = h('section', { class: 'coluna', dataset: { estagio: e.id }, 'aria-labelledby': 'col-' + e.id },
      h('header', { class: 'coluna-cab' },
        h('h2', { class: 'coluna-titulo', id: 'col-' + e.id }, h('span', { class: 'ponto', 'aria-hidden': 'true' }), e.nome, h('span', { class: 'contagem' }, lista.length)),
        h('p', { class: 'coluna-soma' }, soma ? formatarMoeda(soma) : e.ajuda),
      ),
      lista.length
        ? h('ul', { class: 'cards' }, lista.map((c) => cartaoKanban(c, hoje)))
        : h('p', { class: 'coluna-vazia' }, 'Arraste um card para cá'),
    );
    col.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; col.classList.add('alvo'); });
    col.addEventListener('dragleave', (ev) => { if (!col.contains(ev.relatedTarget)) col.classList.remove('alvo'); });
    col.addEventListener('drop', (ev) => {
      ev.preventDefault();
      col.classList.remove('alvo');
      const id = ev.dataTransfer.getData('text/plain');
      if (id) moverEstagio(id, e.id);
    });
    return col;
  });

  return h('div', { class: 'tela tela-larga' },
    h('header', { class: 'tela-cab' },
      h('div', {},
        h('h1', { class: 'tela-titulo' }, 'Funil'),
        h('p', { class: 'tela-resumo' }, `${plural(ativos.length, 'lead ativo', 'leads ativos')} · ${formatarMoeda(ativos.reduce((s, c) => s + (Number(c.valor) || 0), 0))} em aberto. Arraste os cards ou use a seta para avançar.`),
      ),
      h('div', { class: 'filtros' },
        selTemp, selSeg,
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: filtroFunil.encerrados, onchange: (e) => { filtroFunil.encerrados = e.target.checked; rerender(); } }), 'Mostrar fechados e perdidos'),
      ),
    ),
    h('div', { class: 'kanban', dataset: { rolagem: 'kanban' } }, colunas),
  );
}
