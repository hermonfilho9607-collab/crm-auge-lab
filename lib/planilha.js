// Conversão entre o banco do CRM e as abas da planilha Google (Contatos, Historico, Ajustes).
// As colunas são lidas pelo título, então dá para reordenar colunas na planilha sem quebrar nada.
import {
  ESTAGIOS, ESTAGIO, TEMPERATURAS, SITUACAO_SITE, TIPO_INTERACAO, uid, migrar, normalizar, paraNumero,
} from '../public/js/core.js';

export const ABAS = ['Contatos', 'Historico', 'Ajustes'];

const SIM = 'sim';

const COLUNAS_CONTATO = [
  ['id', 'ID'], ['empresa', 'Empresa'], ['pessoa', 'Pessoa'], ['cargo', 'Cargo'], ['segmento', 'Segmento'],
  ['cidade', 'Cidade'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['instagram', 'Instagram'], ['site', 'Site'],
  ['situacaoSite', 'Situação do site'], ['origem', 'Origem'], ['estagio', 'Estágio'], ['temperatura', 'Temperatura'],
  ['valor', 'Valor'], ['proximoTexto', 'Próximo passo'], ['proximoData', 'Data do próximo passo'],
  ['ultimoContato', 'Último contato'], ['motivoPerda', 'Motivo da perda'], ['tags', 'Tags'], ['notas', 'Notas'],
  ['criadoEm', 'Criado em'], ['atualizadoEm', 'Atualizado em'], ['estagioDesde', 'No estágio desde'], ['demo', 'Exemplo'],
];

const COLUNAS_HISTORICO = [
  ['id', 'ID'], ['contato', 'Contato ID'], ['nome', 'Contato'], ['tipo', 'Tipo'], ['em', 'Data'],
  ['texto', 'Descrição'], ['de', 'De'], ['para', 'Para'],
];

const NOMES_TIPO = {
  ...Object.fromEntries(Object.values(TIPO_INTERACAO).map((t) => [t.id, t.nome])),
  criado: 'Contato cadastrado',
  estagio: 'Mudança de estágio',
};

// ---------- valores ----------
function porNome(lista, valor, padrao = '') {
  const n = normalizar(valor);
  if (!n) return padrao;
  const achado = lista.find((x) => normalizar(x.id) === n || normalizar(x.nome) === n);
  return achado ? achado.id : padrao;
}

function tipoPorNome(valor) {
  const n = normalizar(valor);
  return Object.keys(NOMES_TIPO).find((id) => normalizar(id) === n || normalizar(NOMES_TIPO[id]) === n) || 'nota';
}

/** Aceita ISO, AAAA-MM-DD e DD/MM/AAAA [HH:MM[:SS]] (o que o Sheets mostra quando a célula foi digitada à mão). */
export function lerDataHora(valor) {
  const s = String(valor ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, d, mes, a, hh = '0', mm = '0', ss = '0'] = m;
    return new Date(+a, +mes - 1, +d, +hh, +mm, +ss).toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12).toISOString();
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString();
}

export function lerDia(valor) {
  const s = String(valor ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '';
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function formatarValor(v) {
  const n = Number(v) || 0;
  return n ? String(n).replace('.', ',') : '';
}

// ---------- banco → abas ----------
export function paraAbas(db) {
  const nomes = Object.fromEntries(db.contatos.map((c) => [c.id, c.empresa || c.pessoa || '']));
  const contatos = [COLUNAS_CONTATO.map(([, t]) => t)];
  const historico = [COLUNAS_HISTORICO.map(([, t]) => t)];
  for (const c of db.contatos) {
    const v = {
      ...c,
      situacaoSite: SITUACAO_SITE.find((s) => s.id === c.situacaoSite && s.id)?.nome || '',
      estagio: ESTAGIO[c.estagio]?.nome || c.estagio,
      temperatura: TEMPERATURAS.find((t) => t.id === c.temperatura)?.nome || '',
      valor: formatarValor(c.valor),
      proximoTexto: c.proximaAcao?.texto || '',
      proximoData: c.proximaAcao?.data || '',
      tags: (c.tags || []).join(', '),
      demo: c.demo ? SIM : '',
    };
    contatos.push(COLUNAS_CONTATO.map(([k]) => String(v[k] ?? '')));
    for (const it of c.historico || []) {
      const h = {
        ...it,
        contato: c.id,
        nome: nomes[c.id],
        tipo: NOMES_TIPO[it.tipo] || it.tipo,
        de: it.de ? ESTAGIO[it.de]?.nome || it.de : '',
        para: it.para ? ESTAGIO[it.para]?.nome || it.para : '',
      };
      historico.push(COLUNAS_HISTORICO.map(([k]) => String(h[k] ?? '')));
    }
  }
  const ajustes = [['Chave', 'Valor'], ...Object.entries(db.ajustes || {}).map(([k, v]) => [k, String(v ?? '')])];
  return { Contatos: contatos, Historico: historico, Ajustes: ajustes };
}

// ---------- abas → banco ----------
function linhasComoObjetos(linhas, colunas) {
  if (!linhas?.length) return [];
  const titulo = Object.fromEntries(colunas.map(([k, t]) => [normalizar(t), k]));
  const mapa = linhas[0].map((h) => titulo[normalizar(h)] || null);
  return linhas.slice(1)
    .filter((l) => l.some((c) => String(c ?? '').trim() !== ''))
    .map((l) => Object.fromEntries(mapa.map((k, i) => [k, String(l[i] ?? '').trim()]).filter(([k]) => k)));
}

export function deAbas(abas = {}) {
  const linhasHist = linhasComoObjetos(abas.Historico, COLUNAS_HISTORICO);
  const porContato = new Map();
  for (const h of linhasHist) {
    if (!h.contato) continue;
    const tipo = tipoPorNome(h.tipo);
    const item = { id: h.id || uid(), tipo, em: lerDataHora(h.em) || new Date().toISOString(), texto: h.texto || '' };
    if (tipo === 'estagio') {
      item.de = porNome(ESTAGIOS, h.de, 'novo');
      item.para = porNome(ESTAGIOS, h.para, 'novo');
    }
    if (!porContato.has(h.contato)) porContato.set(h.contato, []);
    porContato.get(h.contato).push(item);
  }

  const contatos = linhasComoObjetos(abas.Contatos, COLUNAS_CONTATO)
    .filter((r) => r.empresa || r.pessoa)
    .map((r) => {
      const id = r.id || uid();
      const criadoEm = lerDataHora(r.criadoEm) || new Date().toISOString();
      const estagio = porNome(ESTAGIOS, r.estagio, 'novo');
      const historico = (porContato.get(r.id) || []).sort((a, b) => (a.em < b.em ? -1 : a.em > b.em ? 1 : 0));
      if (!historico.some((h) => h.tipo === 'criado')) historico.unshift({ id: uid(), tipo: 'criado', em: criadoEm, texto: '' });
      const mudancas = historico.filter((h) => h.tipo === 'estagio');
      const estagios = [{ estagio: mudancas[0]?.de || estagio, em: criadoEm }, ...mudancas.map((h) => ({ estagio: h.para, em: h.em }))];
      return {
        id,
        empresa: r.empresa || '',
        pessoa: r.pessoa || '',
        cargo: r.cargo || '',
        segmento: r.segmento || '',
        cidade: r.cidade || '',
        telefone: r.telefone || '',
        email: r.email || '',
        instagram: r.instagram || '',
        site: r.site || '',
        situacaoSite: porNome(SITUACAO_SITE.filter((s) => s.id), r.situacaoSite, ''),
        origem: r.origem || '',
        temperatura: porNome(TEMPERATURAS, r.temperatura, 'morna'),
        valor: paraNumero(r.valor),
        tags: (r.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        notas: r.notas || '',
        proximaAcao: { texto: r.proximoTexto || '', data: lerDia(r.proximoData) },
        motivoPerda: r.motivoPerda || '',
        estagio,
        estagioDesde: lerDataHora(r.estagioDesde) || mudancas.at(-1)?.em || criadoEm,
        criadoEm,
        atualizadoEm: lerDataHora(r.atualizadoEm) || criadoEm,
        ultimoContato: lerDataHora(r.ultimoContato),
        historico,
        estagios,
        ...(normalizar(r.demo) === SIM ? { demo: true } : {}),
      };
    });

  const ajustes = {};
  for (const r of linhasComoObjetos(abas.Ajustes, [['chave', 'Chave'], ['valor', 'Valor']])) {
    if (!r.chave) continue;
    ajustes[r.chave] = r.valor !== '' && !Number.isNaN(Number(r.valor)) ? Number(r.valor) : r.valor;
  }
  return migrar({ versao: 1, contatos, ajustes });
}
