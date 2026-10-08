# CRM Auge Lab

CRM de prospecção da Auge Lab, sem dependências e sem build. Os contatos ficam numa **planilha Google** sua
(ou, sem planilha configurada, em `dados/crm.json` neste computador). Roda no computador pelo `iniciar.bat`
ou na Vercel, protegido por senha.

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

## Planilha Google (onde os contatos ficam)

Com a planilha configurada, o CRM grava tudo numa planilha sua, com três abas: **Contatos** (um contato por linha),
**Historico** (cada interação e mudança de estágio) e **Ajustes**. Funciona igual no computador e na Vercel,
e dá para ver, filtrar e até editar os contatos direto no Google Sheets.

### Configurar (uma vez só)

1. Crie uma planilha nova no Google Sheets (ex.: "CRM Auge Lab").
2. Na planilha: **Extensões → Apps Script**. Apague o código que aparecer e cole todo o conteúdo de
   `google-apps-script/Codigo-pronto.gs` (já vem com o seu token secreto; o arquivo fica só no seu computador).
   Clique em **Salvar**.
3. **Implantar → Nova implantação** → na engrenagem, escolha **App da Web**.
   *Executar como:* **Eu**. *Quem pode acessar:* **Qualquer pessoa**. Clique em **Implantar** e autorize com a sua conta Google
   (se aparecer "app não verificado": *Avançado → Acessar*; o script é seu).
4. Copie a **URL do app da Web** (termina em `/exec`) e cole no arquivo `.env`, em `GOOGLE_SHEETS_URL=`.
5. Feche e abra o `iniciar.bat`. A tela **Dados** passa a mostrar o link da planilha.

"Qualquer pessoa" só significa que a URL aceita chamadas: sem o token secreto, o script recusa tudo.
Se mudar o código do Apps Script, use *Implantar → Gerenciar implantações → editar → Nova versão* (a URL continua a mesma).

### Na Vercel

Em **Settings → Environment Variables** do projeto, crie:

| Variável | Valor |
|---|---|
| `GOOGLE_SHEETS_URL` | a mesma URL do `.env` |
| `GOOGLE_SHEETS_TOKEN` | o mesmo token do `.env` |
| `CRM_SENHA` | uma senha forte para entrar no CRM (obrigatória na Vercel) |

Depois faça um novo deploy (*Deployments → ⋯ → Redeploy*). Sem essas variáveis o CRM mostra uma tela dizendo o que falta,
em vez de expor ou perder dados. No computador a senha é opcional (`CRM_SENHA` no `.env`).

### Editar a planilha à mão

Pode: mudar células, colar linhas novas (o CRM dá um ID a elas), digitar datas como `15/10/2026` e valores como `1.500`.
Ao editar, o CRM percebe a mudança e pede para recarregar antes de gravar por cima. Não apague a coluna **ID**.
Para voltar no tempo: **Arquivo → Histórico de versões** da planilha.

Sem `GOOGLE_SHEETS_URL`, o CRM volta ao modo antigo e guarda tudo em `dados/crm.json` (veja abaixo).

## Modo sem planilha (arquivo local)

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
server.js            servidor local (lê o .env, serve public/ e a API)
api/                 funções da Vercel (/api/db, /api/sessao)
lib/                 API compartilhada, senha, escolha do armazém, conversão para a planilha
google-apps-script/  código que vai dentro da planilha (Codigo.gs; Codigo-pronto.gs tem o seu token e não vai pro git)
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
