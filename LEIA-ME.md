# CRM Auge Lab

CRM de prospecção que roda **só neste computador**: sem conta, sem internet, sem dependências e sem build.
Um servidorzinho em Node guarda tudo em `dados/crm.json` e a interface abre no navegador.

## Abrir

Dê dois cliques em **`iniciar.bat`**. O navegador abre em http://localhost:5182.
Deixe a janela preta aberta enquanto usa; para encerrar, feche-a (ou Ctrl+C).
Precisa do Node.js 20+ (já instalado aqui: v24).

Pelo terminal: `node server.js` (ou `npm start`). Outra porta: `set PORTA=5190 && node server.js`.

## Como usar

1. **Cadastre** quem você quer abordar (**N** abre o cadastro rápido; "Salvar e adicionar outro" mantém segmento,
   cidade e origem para listas de um nicho) ou **importe** uma planilha CSV em *Contatos → Importar*.
2. Em cada contato, **registre a interação** (WhatsApp, ligação, e-mail, Direct, reunião, visita, anotação),
   diga para qual estágio ele foi e **defina o próximo passo** com data.
3. A tela **Hoje** mostra os follow-ups atrasados, de hoje e da semana, quem está sem próximo passo,
   quem está sem contato há 14+ dias, até onde os leads chegaram no funil e sua meta semanal de contatos.
4. O **Funil** é um kanban: arraste os cards ou use a seta para avançar. Ao marcar como perdido, o CRM pede o motivo.

Estágios: Novo lead → Primeiro contato → Em conversa → Reunião → Proposta enviada → Negociação → Fechado (ou Perdido).
Toda mudança de estágio fica na linha do tempo do contato, com data.

Atalhos: **N** novo contato · **/** buscar · **Esc** fecha a ficha. Quase toda ação tem **Desfazer** no aviso que aparece embaixo.

## Seus dados

- `dados/crm.json` — o banco (JSON legível). Gravação automática a cada alteração.
- `dados/backups/` — uma cópia por dia de uso, mantendo os últimos 30 dias.
- *Dados → Baixar backup completo* gera um `.json` para guardar na nuvem ou levar a outro computador
  (*Restaurar backup* faz o caminho de volta). *Exportar todos (Excel)* gera CSV com `;` e acentos certos.
- A pasta `dados/` está no `.gitignore`: os contatos de prospecção nunca vão para o repositório.
- Se abrir o CRM em duas abas e editar nas duas, a segunda a salvar recebe um aviso para recarregar
  (nada é sobrescrito sem você saber).

## Importar planilha

CSV separado por `;`, `,` ou tabulação, em UTF-8 ou no padrão do Excel brasileiro. Cabeçalhos reconhecidos
(sem diferenciar acento/maiúscula): Empresa/Nome/Nome fantasia, Contato/Responsável, Cargo, Telefone/WhatsApp/Celular,
E-mail, Instagram, Site, Cidade, Segmento/Nicho/Categoria, Origem, Valor, Notas/Observações, Tags.
Repetidos (mesmo telefone, e-mail, Instagram ou empresa+cidade) são ignorados. *Dados → Baixar modelo* traz um exemplo.

## Organização

```
server.js            servidor local (API /api/db com controle de revisão, backups, arquivos estáticos)
public/index.html    casca da interface
public/css/app.css   tokens (claro/escuro), layout e componentes
public/js/core.js    regras puras: estágios, histórico, follow-ups, métricas, busca, CSV
public/js/store.js   estado + gravação automática
public/js/app.js     rotas (#/hoje, #/funil, #/contatos, #/dados; ?c=<id> abre a ficha)
public/js/contato.js ficha lateral, cadastro rápido, mover estágio, excluir
public/js/telas-*.js telas
tests/               node --test (npm test) — regras e servidor
```

Para trocar a cor da marca, edite `--acento` (e o equivalente do tema escuro) no topo de `app.css` e o `icone.svg`.
Estágios, tipos de interação, origens e motivos de perda ficam no topo de `core.js`.
