// Telas "Contatos" (tabela filtrável) e "Dados" (backup, importação, ajustes).
import { h, icone, aviso, confirmar, baixarArquivo, escolherArquivo, lerTexto, campo } from './ui.js';
import * as store from './store.js';
import {
  ESTAGIOS, TEMPERATURAS, filtrar, ordenar, valoresUnicos, exportarCSV, nomeExibicao, formatarMoeda,
  formatarRelativo, diaISO, migrar, ativo,
} from './core.js';
import { chipEstagio, seloTemperatura, seloFollowUp, linksRapidos, vazio } from './componentes.js';
import { abrirContato } from './nav.js';
import { novoContatoDialogo } from './contato.js';
import { importarDialogo, modeloCSV } from './importar.js';
import { boasVindas } from './telas-funil.js';
import { carregarExemplos, removerExemplos } from './exemplos.js';

export const filtros = { termo: '', estagio: 'ativos', temperatura: '', segmento: '', cidade: '', origem: '', followup: '' };
const ordem = { campo: 'proximaAcao', direcao: 'asc' };
const rerender = () => document.dispatchEvent(new CustomEvent('crm:render'));

const FOLLOWUPS = [
  { id: 'atrasado', nome: 'Atrasados' }, { id: 'hoje', nome: 'Para hoje' },
  { id: 'semana', nome: 'Próximos 7 dias' }, { id: 'sem', nome: 'Sem próximo passo' },
];

function seletor(rotulo, chave, lista, todos) {
  return h('select', {
    'aria-label': rotulo,
    class: filtros[chave] ? 'ativo' : '',
    onchange: (e) => { filtros[chave] = e.target.value; rerender(); },
  },
  h('option', { value: '' }, todos),
  lista.map((o) => {
    const [v, t] = typeof o === 'string' ? [o, o] : [o.id, o.nome];
    return h('option', { value: v, selected: filtros[chave] === v }, t);
  }));
}

function cabecalho(rotulo, chave, classe = '') {
  const atual = ordem.campo === chave;
  return h('th', { scope: 'col', class: classe, 'aria-sort': atual ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : null },
    h('button', {
      class: 'th-ordenar' + (atual ? ' atual' : ''), type: 'button',
      onclick: () => {
        if (ordem.campo === chave) ordem.direcao = ordem.direcao === 'asc' ? 'desc' : 'asc';
        else { ordem.campo = chave; ordem.direcao = chave === 'valor' || chave === 'ultimoContato' ? 'desc' : 'asc'; }
        rerender();
      },
    }, rotulo, icone('ordenar', 'ic-ordenar')));
}

export function telaContatos() {
  const db = store.obter();
  if (!db.contatos.length) return boasVindas();
  const hoje = diaISO();
  const lista = ordenar(filtrar(db.contatos, filtros), ordem.campo, ordem.direcao);
  const algumFiltro = Object.entries(filtros).some(([k, v]) => (k === 'estagio' ? v !== 'ativos' : v));

  const selEstagio = h('select', {
    'aria-label': 'Filtrar por estágio',
    class: filtros.estagio !== 'ativos' ? 'ativo' : '',
    onchange: (e) => { filtros.estagio = e.target.value; rerender(); },
  },
  h('option', { value: 'ativos', selected: filtros.estagio === 'ativos' }, 'Leads ativos'),
  h('option', { value: '', selected: filtros.estagio === '' }, 'Todos os estágios'),
  ESTAGIOS.map((e) => h('option', { value: e.id, selected: filtros.estagio === e.id }, e.nome)));

  const busca = h('input', {
    type: 'search', value: filtros.termo, placeholder: 'Buscar por nome, cidade, telefone, nota…', 'aria-label': 'Buscar contatos', class: 'busca-lista',
  });
  busca.addEventListener('input', () => {
    filtros.termo = busca.value;
    document.dispatchEvent(new CustomEvent('crm:render', { detail: { manterFoco: true } }));
  });

  const linhas = lista.map((c) => h('tr', { dataset: { id: c.id }, onclick: (e) => { if (!e.target.closest('a,button')) abrirContato(c.id); } },
    h('td', { class: 'td-nome' },
      h('button', { class: 'lc-abrir', type: 'button', onclick: () => abrirContato(c.id) },
        h('span', { class: 'lc-nome' }, nomeExibicao(c)),
        h('span', { class: 'lc-sub' }, [c.pessoa && c.empresa ? c.pessoa : '', c.segmento, c.cidade].filter(Boolean).join(' · ') || '—'))),
    h('td', {}, chipEstagio(c.estagio)),
    h('td', {}, seloTemperatura(c.temperatura)),
    h('td', { class: 'td-proximo' }, ativo(c) ? [seloFollowUp(c, hoje), c.proximaAcao?.texto && h('span', { class: 'lc-sub' }, c.proximaAcao.texto)] : h('span', { class: 'mudo' }, '—')),
    h('td', { class: 'mudo' }, c.ultimoContato ? formatarRelativo(c.ultimoContato) : 'nunca'),
    h('td', { class: 'num' }, c.valor ? formatarMoeda(c.valor) : ''),
    h('td', { class: 'td-acoes' }, linksRapidos(c, { compacto: true })),
  ));

  return h('div', { class: 'tela tela-larga' },
    h('header', { class: 'tela-cab' },
      h('div', {},
        h('h1', { class: 'tela-titulo' }, 'Contatos'),
        h('p', { class: 'tela-resumo', 'aria-live': 'polite' }, `${lista.length} de ${db.contatos.length} ${db.contatos.length === 1 ? 'contato' : 'contatos'}`),
      ),
      h('div', { class: 'acoes-cab' },
        h('button', { class: 'btn', type: 'button', onclick: () => importarDialogo() }, icone('enviar'), 'Importar'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => { baixarArquivo(`contatos-auge-lab-${diaISO()}.csv`, exportarCSV(lista), 'text/csv;charset=utf-8'); aviso(`${lista.length} contatos exportados`); },
        }, icone('baixar'), 'Exportar'),
      ),
    ),
    h('div', { class: 'filtros filtros-lista' },
      busca,
      selEstagio,
      seletor('Filtrar por próximo passo', 'followup', FOLLOWUPS, 'Qualquer próximo passo'),
      seletor('Filtrar por temperatura', 'temperatura', TEMPERATURAS, 'Todas as temperaturas'),
      seletor('Filtrar por segmento', 'segmento', valoresUnicos(db.contatos, 'segmento'), 'Todos os segmentos'),
      seletor('Filtrar por cidade', 'cidade', valoresUnicos(db.contatos, 'cidade'), 'Todas as cidades'),
      seletor('Filtrar por origem', 'origem', valoresUnicos(db.contatos, 'origem'), 'Todas as origens'),
      algumFiltro && h('button', {
        class: 'btn btn-suave', type: 'button',
        onclick: () => { Object.assign(filtros, { termo: '', estagio: 'ativos', temperatura: '', segmento: '', cidade: '', origem: '', followup: '' }); rerender(); },
      }, 'Limpar filtros'),
    ),
    lista.length
      ? h('div', { class: 'tabela-caixa cartao', dataset: { rolagem: 'tabela' } },
        h('table', { class: 'tabela' },
          h('caption', { class: 'sr-only' }, 'Contatos, ordenáveis pelos cabeçalhos'),
          h('thead', {}, h('tr', {},
            cabecalho('Contato', 'empresa'), cabecalho('Estágio', 'estagio'), cabecalho('Temperatura', 'temperatura'),
            cabecalho('Próximo passo', 'proximaAcao'), cabecalho('Último contato', 'ultimoContato'), cabecalho('Valor', 'valor', 'num'),
            h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Atalhos')))),
          h('tbody', {}, linhas)))
      : h('div', { class: 'cartao' }, vazio({
        icone: 'busca', titulo: 'Nenhum contato com esses filtros',
        texto: filtros.termo ? `Nada encontrado para "${filtros.termo}".` : 'Tente outro estágio ou limpe os filtros.',
        acoes: [h('button', { class: 'btn', type: 'button', onclick: () => novoContatoDialogo({ segmento: filtros.segmento, cidade: filtros.cidade }) }, icone('mais'), 'Novo contato')],
      })),
  );
}

// ---------- DADOS ----------
let info = null;

export function telaDados() {
  const db = store.obter();
  if (!info) fetch('/api/info').then((r) => r.json()).then((j) => { info = j; rerender(); }).catch(() => {});
  const demos = db.contatos.filter((c) => c.demo).length;

  const meta = h('input', { type: 'number', min: 0, step: 1, value: db.ajustes.metaContatosSemana ?? 0, class: 'input-curto' });
  meta.addEventListener('change', () => { store.alterar((d) => { d.ajustes.metaContatosSemana = Math.max(0, Math.round(Number(meta.value) || 0)); }); aviso('Meta atualizada'); });

  const tema = h('select', {}, [['auto', 'Automático (do sistema)'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([v, t]) => h('option', { value: v, selected: (document.documentElement.dataset.tema || 'auto') === v }, t)));
  tema.addEventListener('change', () => document.dispatchEvent(new CustomEvent('crm:tema', { detail: tema.value })));

  return h('div', { class: 'tela' },
    h('header', { class: 'tela-cab' }, h('div', {}, h('h1', { class: 'tela-titulo' }, 'Dados e ajustes'),
      h('p', { class: 'tela-resumo' }, 'Tudo fica neste computador. Nada é enviado para a internet.'))),
    h('div', { class: 'secoes' },
      h('section', { class: 'cartao', 'aria-labelledby': 'onde-t' },
        h('h2', { class: 'cartao-titulo', id: 'onde-t' }, 'Onde ficam seus dados'),
        h('dl', { class: 'lista-def' },
          h('dt', {}, 'Arquivo'), h('dd', {}, h('code', {}, info?.arquivo || 'crm-vetta\\dados\\crm.json')),
          h('dt', {}, 'Backups automáticos'), h('dd', {}, h('code', {}, info?.backups || 'crm-vetta\\dados\\backups'), h('span', { class: 'mudo' }, ' — uma cópia por dia de uso, guardando os últimos 30 dias.')),
          h('dt', {}, 'Contatos'), h('dd', {}, `${db.contatos.length} (${db.contatos.filter(ativo).length} ativos)`),
        ),
        h('p', { class: 'mudo' }, 'Para levar para outro computador ou guardar na nuvem, baixe o backup completo.'),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn btn-primario', type: 'button', onclick: () => baixarArquivo(`crm-auge-lab-backup-${diaISO()}.json`, JSON.stringify(store.obter(), null, 2), 'application/json') }, icone('baixar'), 'Baixar backup completo'),
          h('button', {
            class: 'btn', type: 'button',
            onclick: async () => {
              const arq = await escolherArquivo('.json,application/json');
              if (!arq) return;
              let novo;
              try { novo = migrar(JSON.parse(await lerTexto(arq))); } catch { aviso('Esse arquivo não é um backup válido do CRM.', { tipo: 'erro' }); return; }
              const ok = await confirmar({
                titulo: 'Restaurar backup?',
                descricao: `O backup tem ${novo.contatos.length} contatos e vai substituir os ${store.obter().contatos.length} atuais. Um backup do estado atual já está guardado na pasta de backups.`,
                ok: 'Restaurar', perigo: true,
              });
              if (!ok) return;
              const antes = structuredClone(store.obter());
              store.substituir(novo);
              aviso('Backup restaurado', { acao: 'Desfazer', aoAgir: () => store.substituir(antes), tempo: 10000 });
            },
          }, icone('enviar'), 'Restaurar backup'),
        ),
      ),
      h('section', { class: 'cartao', 'aria-labelledby': 'planilha-t' },
        h('h2', { class: 'cartao-titulo', id: 'planilha-t' }, 'Planilhas'),
        h('p', {}, 'Importe listas de prospecção (Google Maps, Instagram, planilhas antigas) em CSV. O CRM reconhece colunas como ',
          h('em', {}, 'Empresa, Contato, Telefone, WhatsApp, E-mail, Instagram, Site, Cidade, Segmento, Origem, Notas'), ' e ignora contatos repetidos.'),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn', type: 'button', onclick: () => importarDialogo() }, icone('enviar'), 'Importar CSV'),
          h('button', { class: 'btn', type: 'button', onclick: () => baixarArquivo('modelo-importacao-crm.csv', modeloCSV(), 'text/csv;charset=utf-8') }, icone('baixar'), 'Baixar modelo'),
          h('button', { class: 'btn', type: 'button', onclick: () => baixarArquivo(`contatos-auge-lab-${diaISO()}.csv`, exportarCSV(store.obter().contatos), 'text/csv;charset=utf-8') }, icone('baixar'), 'Exportar todos (Excel)'),
        ),
      ),
      h('section', { class: 'cartao', 'aria-labelledby': 'ajustes-t' },
        h('h2', { class: 'cartao-titulo', id: 'ajustes-t' }, 'Ajustes'),
        h('div', { class: 'grade-2' },
          campo('Meta de contatos por semana', meta, { ajuda: 'Aparece no painel Hoje. Use 0 para esconder.' }),
          campo('Aparência', tema),
        ),
      ),
      h('section', { class: 'cartao', 'aria-labelledby': 'exemplos-t' },
        h('h2', { class: 'cartao-titulo', id: 'exemplos-t' }, 'Dados de exemplo'),
        demos
          ? [h('p', {}, `Há ${demos} contatos de exemplo misturados aos seus. Remova quando quiser começar de verdade — os seus ficam.`),
            h('div', { class: 'linha-botoes' }, h('button', { class: 'btn btn-perigo', type: 'button', onclick: removerExemplos }, icone('lixo'), `Remover ${demos} exemplos`))]
          : [h('p', {}, 'Carregue alguns contatos fictícios para ver o CRM funcionando. Eles ficam marcados e saem com um clique.'),
            h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', type: 'button', onclick: carregarExemplos }, 'Carregar exemplos'))],
      ),
    ),
  );
}
