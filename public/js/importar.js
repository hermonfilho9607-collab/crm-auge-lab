// Importação de contatos a partir de CSV, com pré-visualização antes de gravar.
import { h, aviso, dialogo, escolherArquivo, lerTexto, campo, limpar } from './ui.js';
import * as store from './store.js';
import { parseCSV, importarLinhas, ORIGENS } from './core.js';

const NOMES_CAMPO = {
  empresa: 'Empresa', pessoa: 'Pessoa', cargo: 'Cargo', segmento: 'Segmento', cidade: 'Cidade', telefone: 'Telefone',
  email: 'E-mail', instagram: 'Instagram', site: 'Site', origem: 'Origem', valor: 'Valor', notas: 'Notas', tags: 'Tags',
};

export function modeloCSV() {
  return '﻿' + [
    'Empresa;Contato;Telefone;Instagram;Email;Site;Cidade;Segmento;Origem;Notas',
    'Padaria Pão Dourado;Marta;(11) 98888-1234;@paodourado;;;"São Paulo";Padaria;Google Maps;Sem site, só Instagram',
  ].join('\r\n');
}

export async function importarDialogo() {
  const arq = await escolherArquivo('.csv,.txt,text/csv');
  if (!arq) return;
  let linhas;
  try {
    linhas = parseCSV(await lerTexto(arq));
  } catch {
    aviso('Não consegui ler esse arquivo. Salve a planilha como CSV e tente de novo.', { tipo: 'erro' });
    return;
  }
  if (linhas.length < 2) {
    aviso('A planilha precisa de uma linha de cabeçalho e pelo menos um contato.', { tipo: 'erro' });
    return;
  }

  await dialogo({
    titulo: 'Importar contatos',
    descricao: arq.name,
    classe: 'dlg-medio',
    corpo: (fechar) => {
      const origem = h('input', { type: 'text', list: 'dl-imp-ori', placeholder: 'Ex.: Google Maps' });
      const segmento = h('input', { type: 'text', placeholder: 'Ex.: Clínica odontológica' });
      const resumo = h('div', { class: 'import-resumo', 'aria-live': 'polite' });
      const botao = h('button', { class: 'btn btn-primario', type: 'submit' });
      let resultado;
      const calcular = () => {
        resultado = importarLinhas(linhas, store.obter().contatos, { origem: origem.value.trim(), segmento: segmento.value.trim() });
        const reconhecidas = resultado.colunas.filter((c) => c.campo);
        const ignoradas = resultado.colunas.filter((c) => !c.campo);
        limpar(resumo,
          h('ul', { class: 'import-numeros' },
            h('li', {}, h('strong', {}, resultado.novos.length), ' novos'),
            h('li', {}, h('strong', {}, resultado.duplicados), ' já existiam (ignorados)'),
            resultado.semNome > 0 && h('li', {}, h('strong', {}, resultado.semNome), ' sem nome (ignorados)'),
          ),
          h('p', { class: 'mudo' }, 'Colunas reconhecidas: ',
            reconhecidas.length ? reconhecidas.map((c) => `${c.cabecalho} → ${NOMES_CAMPO[c.campo]}`).join(', ') : 'nenhuma'),
          ignoradas.length > 0 && h('p', { class: 'mudo' }, 'Ignoradas: ', ignoradas.map((c) => c.cabecalho || '(sem título)').join(', ')),
          !reconhecidas.some((c) => c.campo === 'empresa' || c.campo === 'pessoa') && h('p', { class: 'campo-erro' }, 'Nenhuma coluna de nome encontrada. Renomeie o cabeçalho para "Empresa" ou "Contato".'),
        );
        botao.textContent = resultado.novos.length ? `Importar ${resultado.novos.length} contatos` : 'Nada para importar';
        botao.disabled = !resultado.novos.length;
      };
      origem.addEventListener('input', calcular);
      segmento.addEventListener('input', calcular);
      calcular();
      return h('form', {
        class: 'form',
        onsubmit: (e) => {
          e.preventDefault();
          if (!resultado.novos.length) return;
          const antes = structuredClone(store.obter());
          const n = resultado.novos.length;
          store.alterar((db) => db.contatos.push(...resultado.novos));
          fechar(n);
          aviso(`${n} contatos importados como "Novo lead"`, { tipo: 'sucesso', acao: 'Desfazer', aoAgir: () => store.substituir(antes), tempo: 8000 });
        },
      },
        resumo,
        h('datalist', { id: 'dl-imp-ori' }, ORIGENS.map((o) => h('option', { value: o }))),
        h('div', { class: 'grade-2' },
          campo('Origem para todos', origem, { ajuda: 'Usada quando a planilha não tiver essa coluna.' }),
          campo('Segmento para todos', segmento, { ajuda: 'Idem — útil para listas de um nicho só.' }),
        ),
        h('div', { class: 'dlg-acoes' },
          h('button', { class: 'btn', type: 'button', onclick: () => fechar(undefined) }, 'Cancelar'),
          botao,
        ),
      );
    },
  });
}

