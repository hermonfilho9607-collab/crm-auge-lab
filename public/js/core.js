// Regras do CRM, sem DOM: estágios, histórico, follow-ups, métricas, busca e CSV.
// Importado pela interface e pelos testes (node --test).

export const ESTAGIOS = [
  { id: 'novo', nome: 'Novo lead', curto: 'Novo', ajuda: 'Ainda não abordado' },
  { id: 'contato', nome: 'Primeiro contato', curto: 'Abordado', ajuda: 'Mensagem enviada, aguardando resposta' },
  { id: 'conversa', nome: 'Em conversa', curto: 'Conversa', ajuda: 'Respondeu e está trocando ideias' },
  { id: 'reuniao', nome: 'Reunião', curto: 'Reunião', ajuda: 'Reunião ou diagnóstico agendado/feito' },
  { id: 'proposta', nome: 'Proposta enviada', curto: 'Proposta', ajuda: 'Orçamento nas mãos do cliente' },
  { id: 'negociacao', nome: 'Negociação', curto: 'Negociação', ajuda: 'Ajustando escopo, prazo ou preço' },
  { id: 'ganho', nome: 'Fechado', curto: 'Fechado', ajuda: 'Virou cliente' },
  { id: 'perdido', nome: 'Perdido', curto: 'Perdido', ajuda: 'Não avançou (com motivo)' },
];
export const ESTAGIO = Object.fromEntries(ESTAGIOS.map((e, i) => [e.id, { ...e, ordem: i }]));
export const ESTAGIOS_ATIVOS = ESTAGIOS.filter((e) => e.id !== 'ganho' && e.id !== 'perdido').map((e) => e.id);
// Caminho do funil (sem "perdido"), usado para medir até onde cada lead chegou.
export const CAMINHO = ESTAGIOS.filter((e) => e.id !== 'perdido').map((e) => e.id);

export const TIPOS_INTERACAO = [
  { id: 'whatsapp', nome: 'WhatsApp' },
  { id: 'ligacao', nome: 'Ligação' },
  { id: 'email', nome: 'E-mail' },
  { id: 'instagram', nome: 'Direct (Instagram)' },
  { id: 'reuniao', nome: 'Reunião' },
  { id: 'visita', nome: 'Visita' },
  { id: 'nota', nome: 'Anotação' },
];
export const TIPO_INTERACAO = Object.fromEntries(TIPOS_INTERACAO.map((t) => [t.id, t]));

export const TEMPERATURAS = [
  { id: 'fria', nome: 'Fria' },
  { id: 'morna', nome: 'Morna' },
  { id: 'quente', nome: 'Quente' },
];

export const ORIGENS = ['Google Maps', 'Instagram', 'Indicação', 'LinkedIn', 'Site / formulário', 'Evento', 'Outro'];
export const MOTIVOS_PERDA = ['Sem orçamento', 'Sem interesse', 'Já tem fornecedor', 'Nunca respondeu', 'Agora não (retomar depois)', 'Outro'];
export const SITUACAO_SITE = [
  { id: '', nome: 'Não verificado' },
  { id: 'nao', nome: 'Não tem site' },
  { id: 'ruim', nome: 'Site fraco / desatualizado' },
  { id: 'bom', nome: 'Site bom' },
];

export const DIAS_PARADO = 14;

// ---------- datas ----------
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function diaISO(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function meiaNoite(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}
export function somarDias(iso, n) {
  const d = meiaNoite(iso);
  d.setDate(d.getDate() + n);
  return diaISO(d);
}
/** Dias inteiros entre duas datas (b - a), pelo calendário local. */
export function diasEntre(a, b) {
  return Math.round((meiaNoite(diaISO(new Date(b))) - meiaNoite(diaISO(new Date(a)))) / 86400000);
}

// ---------- contatos ----------
export function novoContato(campos = {}, agora = new Date()) {
  const em = agora.toISOString();
  const estagio = ESTAGIO[campos.estagio] ? campos.estagio : 'novo';
  return {
    id: uid(),
    empresa: '',
    pessoa: '',
    cargo: '',
    segmento: '',
    cidade: '',
    telefone: '',
    email: '',
    instagram: '',
    site: '',
    situacaoSite: '',
    origem: '',
    temperatura: 'morna',
    valor: 0,
    tags: [],
    notas: '',
    proximaAcao: { texto: '', data: '' },
    motivoPerda: '',
    ...campos,
    estagio,
    estagioDesde: em,
    criadoEm: em,
    atualizadoEm: em,
    ultimoContato: '',
    historico: [{ id: uid(), tipo: 'criado', em, texto: '' }],
    estagios: [{ estagio, em }],
  };
}

export function ativo(c) {
  return c.estagio !== 'ganho' && c.estagio !== 'perdido';
}

export function nomeExibicao(c) {
  return c.empresa || c.pessoa || 'Sem nome';
}

export function mudarEstagio(c, para, { motivo = '', agora = new Date() } = {}) {
  if (!ESTAGIO[para] || c.estagio === para) return false;
  const em = agora.toISOString();
  c.historico.push({ id: uid(), tipo: 'estagio', em, de: c.estagio, para, texto: para === 'perdido' ? motivo : '' });
  c.estagios.push({ estagio: para, em });
  c.estagio = para;
  c.estagioDesde = em;
  c.motivoPerda = para === 'perdido' ? motivo : '';
  if (!ativo(c)) c.proximaAcao = { texto: '', data: '' };
  c.atualizadoEm = em;
  return true;
}

/** Registra uma interação. Contatos reais (não anotações) atualizam "último contato". */
export function registrarInteracao(c, { tipo, em, texto = '' }, agora = new Date()) {
  const quando = em ? new Date(em).toISOString() : agora.toISOString();
  const item = { id: uid(), tipo: TIPO_INTERACAO[tipo] ? tipo : 'nota', em: quando, texto: texto.trim() };
  c.historico.push(item);
  if (item.tipo !== 'nota' && (!c.ultimoContato || quando > c.ultimoContato)) c.ultimoContato = quando;
  c.atualizadoEm = agora.toISOString();
  return item;
}

export function removerInteracao(c, id) {
  const i = c.historico.findIndex((h) => h.id === id);
  if (i < 0 || !TIPO_INTERACAO[c.historico[i].tipo]) return false;
  c.historico.splice(i, 1);
  c.ultimoContato = c.historico
    .filter((h) => TIPO_INTERACAO[h.tipo] && h.tipo !== 'nota')
    .reduce((m, h) => (h.em > m ? h.em : m), '');
  return true;
}

export function historicoOrdenado(c) {
  return [...c.historico].sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0));
}

/** Situação do próximo passo: atrasado | hoje | semana | depois | sem | encerrado */
export function situacaoFollowUp(c, hoje = diaISO()) {
  if (!ativo(c)) return 'encerrado';
  const data = c.proximaAcao?.data;
  if (!data) return 'sem';
  if (data < hoje) return 'atrasado';
  if (data === hoje) return 'hoje';
  if (data <= somarDias(hoje, 7)) return 'semana';
  return 'depois';
}

export function diasSemContato(c, agora = new Date()) {
  return diasEntre(c.ultimoContato || c.criadoEm, agora);
}

export function parado(c, agora = new Date()) {
  return ativo(c) && c.estagio !== 'novo' && diasSemContato(c, agora) >= DIAS_PARADO;
}

// ---------- métricas ----------
function noMes(iso, agora) {
  return iso && iso.slice(0, 7) === diaISO(agora).slice(0, 7);
}

export function metricas(contatos, agora = new Date()) {
  const hoje = diaISO(agora);
  const ativos = contatos.filter(ativo);
  const ganhos = contatos.filter((c) => c.estagio === 'ganho');
  const perdidos = contatos.filter((c) => c.estagio === 'perdido');
  const entradaGanho = (c) => [...c.estagios].reverse().find((e) => e.estagio === 'ganho')?.em;
  const ganhosMes = ganhos.filter((c) => noMes(entradaGanho(c), agora));
  const interacoesMes = contatos.flatMap((c) => c.historico).filter((h) => TIPO_INTERACAO[h.tipo] && h.tipo !== 'nota' && noMes(h.em, agora));
  const encerrados = ganhos.length + perdidos.length;
  return {
    total: contatos.length,
    ativos: ativos.length,
    pipeline: ativos.reduce((s, c) => s + (Number(c.valor) || 0), 0),
    emProposta: ativos.filter((c) => c.estagio === 'proposta' || c.estagio === 'negociacao').length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    conversao: encerrados ? ganhos.length / encerrados : null,
    novosMes: contatos.filter((c) => noMes(c.criadoEm, agora)).length,
    contatosMes: interacoesMes.length,
    ganhosMes: ganhosMes.length,
    receitaMes: ganhosMes.reduce((s, c) => s + (Number(c.valor) || 0), 0),
    atrasados: ativos.filter((c) => situacaoFollowUp(c, hoje) === 'atrasado').length,
    paraHoje: ativos.filter((c) => situacaoFollowUp(c, hoje) === 'hoje').length,
    semProximo: ativos.filter((c) => situacaoFollowUp(c, hoje) === 'sem').length,
    parados: ativos.filter((c) => parado(c, agora)).length,
  };
}

/** Por estágio: quantos estão lá agora e quantos já chegaram até ele em algum momento. */
export function funil(contatos) {
  return CAMINHO.map((id, i) => {
    const agora = contatos.filter((c) => c.estagio === id);
    const chegaram = contatos.filter((c) =>
      c.estagios.some((e) => CAMINHO.indexOf(e.estagio) >= i),
    ).length;
    return { id, nome: ESTAGIO[id].nome, atual: agora.length, valor: agora.reduce((s, c) => s + (Number(c.valor) || 0), 0), chegaram };
  });
}

/** Interações (contatos reais) por semana, das mais antigas às mais recentes. Semanas começam na segunda. */
export function atividadePorSemana(contatos, agora = new Date(), semanas = 8) {
  const hoje = meiaNoite(diaISO(agora));
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const inicios = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() - i * 7);
    inicios.push(diaISO(d));
  }
  const contagem = inicios.map((inicio) => ({ inicio, total: 0 }));
  for (const h of contatos.flatMap((c) => c.historico)) {
    if (!TIPO_INTERACAO[h.tipo] || h.tipo === 'nota') continue;
    const dia = diaISO(new Date(h.em));
    for (let i = contagem.length - 1; i >= 0; i--) {
      if (dia >= contagem[i].inicio) {
        if (i < contagem.length - 1 || dia <= somarDias(contagem[i].inicio, 6)) contagem[i].total++;
        break;
      }
    }
  }
  return contagem;
}

// ---------- busca, filtro, ordenação ----------
export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function combina(c, termo) {
  const t = normalizar(termo);
  if (!t) return true;
  const alvo = normalizar([c.empresa, c.pessoa, c.segmento, c.cidade, c.email, c.instagram, c.telefone, c.notas, ...(c.tags || [])].join(' '));
  const soDigitos = t.replace(/\D/g, '');
  return t.split(/\s+/).every((p) => alvo.includes(p)) || (soDigitos.length >= 4 && digitos(c.telefone).includes(soDigitos));
}

export function filtrar(contatos, f = {}) {
  const hoje = diaISO(f.agora || new Date());
  return contatos.filter((c) => {
    if (f.termo && !combina(c, f.termo)) return false;
    if (f.estagio === 'ativos' && !ativo(c)) return false;
    if (f.estagio && f.estagio !== 'ativos' && c.estagio !== f.estagio) return false;
    if (f.temperatura && c.temperatura !== f.temperatura) return false;
    if (f.segmento && c.segmento !== f.segmento) return false;
    if (f.cidade && c.cidade !== f.cidade) return false;
    if (f.origem && c.origem !== f.origem) return false;
    if (f.followup && situacaoFollowUp(c, hoje) !== f.followup) return false;
    return true;
  });
}

const ORDEM_TEMPERATURA = { quente: 0, morna: 1, fria: 2 };
export function ordenar(contatos, campo = 'proximaAcao', direcao = 'asc') {
  const val = (c) => {
    switch (campo) {
      case 'empresa': return normalizar(nomeExibicao(c));
      case 'estagio': return ESTAGIO[c.estagio].ordem;
      case 'temperatura': return ORDEM_TEMPERATURA[c.temperatura] ?? 3;
      case 'valor': return Number(c.valor) || 0;
      case 'ultimoContato': return c.ultimoContato || '';
      case 'cidade': return normalizar(c.cidade);
      case 'proximaAcao': return ativo(c) ? c.proximaAcao?.data || '9999' : '99999';
      default: return c[campo] ?? '';
    }
  };
  const sinal = direcao === 'desc' ? -1 : 1;
  return [...contatos].sort((a, b) => {
    const x = val(a), y = val(b);
    if (x < y) return -sinal;
    if (x > y) return sinal;
    return normalizar(nomeExibicao(a)) < normalizar(nomeExibicao(b)) ? -1 : 1;
  });
}

export function valoresUnicos(contatos, campo) {
  return [...new Set(contatos.map((c) => c[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ---------- links rápidos ----------
export function digitos(s) {
  return String(s ?? '').replace(/\D/g, '');
}
export function linkWhatsApp(telefone, texto = '') {
  let d = digitos(telefone);
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return `https://wa.me/${d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}
export function linkInstagram(handle) {
  const h = String(handle ?? '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  return h ? `https://instagram.com/${h}` : '';
}
export function linkSite(site) {
  const s = String(site ?? '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// ---------- CSV ----------
export function parseCSV(texto) {
  const t = texto.replace(/^﻿/, '');
  const primeira = t.split(/\r?\n/, 1)[0] || '';
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';'
    : (primeira.match(/\t/g) || []).length > (primeira.match(/,/g) || []).length ? '\t' : ',';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}

// Cabeçalhos aceitos na importação (sem acento, minúsculos) → campo do contato.
const APELIDOS = {
  empresa: ['empresa', 'negocio', 'nome da empresa', 'razao social', 'nome fantasia', 'estabelecimento', 'title', 'nome'],
  pessoa: ['pessoa', 'contato', 'responsavel', 'nome do contato', 'decisor'],
  cargo: ['cargo', 'funcao'],
  segmento: ['segmento', 'nicho', 'categoria', 'ramo', 'categoryname', 'category'],
  cidade: ['cidade', 'municipio', 'city', 'localidade'],
  telefone: ['telefone', 'whatsapp', 'celular', 'fone', 'phone', 'tel'],
  email: ['email', 'e-mail'],
  instagram: ['instagram', 'insta', '@'],
  site: ['site', 'website', 'url', 'web'],
  origem: ['origem', 'fonte', 'canal'],
  valor: ['valor', 'ticket', 'orcamento'],
  notas: ['notas', 'observacoes', 'obs', 'anotacoes', 'observacao'],
  tags: ['tags', 'etiquetas'],
};

export function mapearCabecalho(cabecalho) {
  const usados = new Set();
  return cabecalho.map((h) => {
    const n = normalizar(h);
    for (const [campo, lista] of Object.entries(APELIDOS)) {
      if (!usados.has(campo) && lista.includes(n)) { usados.add(campo); return campo; }
    }
    return null;
  });
}

export function chaveDuplicidade(c) {
  const chaves = [];
  const tel = digitos(c.telefone).slice(-9);
  if (tel.length >= 8) chaves.push('t:' + tel);
  if (c.email) chaves.push('e:' + normalizar(c.email));
  if (c.instagram) chaves.push('i:' + normalizar(c.instagram).replace(/^@/, ''));
  if (c.empresa) chaves.push('n:' + normalizar(c.empresa) + '|' + normalizar(c.cidade));
  return chaves;
}

export function paraNumero(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
}

/** Converte linhas de CSV em contatos novos, pulando duplicados (entre si e contra os existentes). */
export function importarLinhas(linhas, existentes = [], padrao = {}, agora = new Date()) {
  if (!linhas.length) return { novos: [], duplicados: 0, semNome: 0, colunas: [] };
  const mapa = mapearCabecalho(linhas[0]);
  const vistos = new Set(existentes.flatMap(chaveDuplicidade));
  const novos = [];
  let duplicados = 0, semNome = 0;
  for (const linha of linhas.slice(1)) {
    const campos = {};
    mapa.forEach((campo, i) => {
      if (!campo) return;
      const v = (linha[i] ?? '').trim();
      if (!v) return;
      if (campo === 'valor') campos.valor = paraNumero(v);
      else if (campo === 'tags') campos.tags = v.split(/[,|]/).map((x) => x.trim()).filter(Boolean);
      else campos[campo] = v;
    });
    if (!campos.empresa && !campos.pessoa) { semNome++; continue; }
    const chaves = chaveDuplicidade(campos);
    if (chaves.some((k) => vistos.has(k))) { duplicados++; continue; }
    chaves.forEach((k) => vistos.add(k));
    novos.push(novoContato({ origem: padrao.origem || '', segmento: padrao.segmento || '', ...campos }, agora));
  }
  return { novos, duplicados, semNome, colunas: linhas[0].map((h, i) => ({ cabecalho: h, campo: mapa[i] })) };
}

function celula(v) {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportarCSV(contatos) {
  const colunas = [
    ['Empresa', (c) => c.empresa], ['Pessoa', (c) => c.pessoa], ['Cargo', (c) => c.cargo],
    ['Segmento', (c) => c.segmento], ['Cidade', (c) => c.cidade], ['Telefone', (c) => c.telefone],
    ['Email', (c) => c.email], ['Instagram', (c) => c.instagram], ['Site', (c) => c.site],
    ['Origem', (c) => c.origem], ['Estágio', (c) => ESTAGIO[c.estagio].nome], ['Temperatura', (c) => c.temperatura],
    ['Valor', (c) => (Number(c.valor) || 0).toFixed(2).replace('.', ',')],
    ['Próxima ação', (c) => c.proximaAcao?.texto], ['Data próxima ação', (c) => c.proximaAcao?.data],
    ['Último contato', (c) => (c.ultimoContato ? diaISO(new Date(c.ultimoContato)) : '')],
    ['Motivo da perda', (c) => c.motivoPerda], ['Tags', (c) => (c.tags || []).join(', ')], ['Notas', (c) => c.notas],
    ['Criado em', (c) => diaISO(new Date(c.criadoEm))],
  ];
  const linhas = [colunas.map(([h]) => h).join(';')];
  for (const c of contatos) linhas.push(colunas.map(([, f]) => celula(f(c))).join(';'));
  return '﻿' + linhas.join('\r\n');
}

// ---------- banco ----------
export function bancoVazio() {
  return { versao: 1, contatos: [], ajustes: { metaContatosSemana: 30 } };
}

/** Garante o formato atual, preenchendo campos que faltarem (dados antigos ou importados). */
export function migrar(db) {
  const base = bancoVazio();
  const out = { ...base, ...(db || {}), ajustes: { ...base.ajustes, ...(db?.ajustes || {}) } };
  out.contatos = (out.contatos || []).map((c) => {
    const modelo = novoContato({}, new Date(c.criadoEm || Date.now()));
    const m = { ...modelo, ...c };
    m.proximaAcao = { texto: '', data: '', ...(c.proximaAcao || {}) };
    if (!ESTAGIO[m.estagio]) m.estagio = 'novo';
    if (!Array.isArray(m.historico)) m.historico = modelo.historico;
    if (!Array.isArray(m.estagios) || !m.estagios.length) m.estagios = [{ estagio: m.estagio, em: m.criadoEm }];
    if (!Array.isArray(m.tags)) m.tags = [];
    return m;
  });
  return out;
}

// ---------- formatação ----------
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export function formatarMoeda(v) {
  return moeda.format(Number(v) || 0);
}
export function formatarData(iso, opcoes = { day: '2-digit', month: 'short' }) {
  if (!iso) return '';
  const d = iso.length === 10 ? meiaNoite(iso) : new Date(iso);
  return d.toLocaleDateString('pt-BR', opcoes).replace('.', '');
}
export function formatarDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatarData(iso, { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
/** "hoje", "ontem", "há 3 dias", "amanhã", "em 5 dias", ou a data. */
export function formatarRelativo(iso, agora = new Date()) {
  if (!iso) return '';
  const n = diasEntre(agora, iso.length === 10 ? meiaNoite(iso) : new Date(iso));
  if (n === 0) return 'hoje';
  if (n === -1) return 'ontem';
  if (n === 1) return 'amanhã';
  if (n < 0 && n > -31) return `há ${-n} dias`;
  if (n > 0 && n < 31) return `em ${n} dias`;
  return formatarData(iso, { day: '2-digit', month: 'short', year: 'numeric' });
}
