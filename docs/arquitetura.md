# Arquitetura

As regras de negócio (o que a app faz e como calcula) estão na
[especificação](../Especificação%20—%20App%20de%20Orçamentação%20de%20Bolos.md). Este documento explica
como o código está organizado e as decisões técnicas.

## Camadas

```
src/app/  (ecrãs)  ──►  src/db/repo.ts  ──►  SQLite (expo-sqlite)
     │                       │
     └──────────────►  src/domain/  ◄────────┘
                    (cálculo puro, sem React nem base de dados)
```

| Pasta | Responsabilidade | Pode importar |
| --- | --- | --- |
| `src/i18n/` | Textos de cada idioma e idioma atual | Nada (`dispositivo.ts`: `expo-localization`) |
| `src/domain/` | Cálculo de preços, unidades, leitura e formatação de valores | Só `i18n/` |
| `src/db/` | Schema, migrations, queries; mantém os totais guardados certos | `domain/`, `backup/` (migrations) |
| `src/backup/`, `src/share/`, `src/pdf/` | Exportar/importar JSON; texto e PDF para o cliente | `domain/`, módulos Expo |
| `src/ui/` | Componentes partilhados (cartão do bolo, formulários de linha), tema, diálogos | `db/`, `domain/` |
| `src/app/` | Ecrãs e navegação (Expo Router) | tudo |

A regra mais importante: **toda a matemática dos preços vive em `src/domain/pricing.ts`**. Os ecrãs
e as queries chamam `calcularOrcamento`; nunca fazem contas próprias.

## Dinheiro e arredondamento

- Valores monetários guardados em **cêntimos inteiros** (`*_cent`). Percentagens em `REAL` (`30` = 30 %).
- Os cálculos intermédios não são arredondados. Só o preço de cada bolo é arredondado ao euro
  (`arredondarAoEuro`), e o total é a soma desses preços.
- As quantidades são guardadas **na unidade do item** (kg, l, un). A unidade em que foram escritas
  (`unidade_entrada`, ex.: g) fica guardada só para mostrar na interface.

## Cópia de preços (snapshot)

Um orçamento antigo tem de dar sempre o mesmo valor. Por isso:

- Ao adicionar uma linha, copiam-se `descricao`, `unidade` e `preco_unit_cent` do item.
- Ao criar o orçamento, copiam-se `valor_hora_cent`, `indireto_pct` e `margem_pct` das definições.
- `orcamentos.total_cent` e `total_calc_cent` são caches para a lista e a pesquisa, recalculados
  por `recalcularTotais` depois de cada escrita em `repo.ts`. A fonte de verdade são as linhas.
- **Exceção:** o nome do negócio, a cor e os contactos do PDF não são copiados para o orçamento.
  São a apresentação do negócio, não fazem parte do preço: quem muda de contacto quer o novo também
  nos PDF de orçamentos antigos.
- Preço editado à mão: `orcamento_bolos.preco_final_cent` (`null` = usa o calculado). Guarda-se também
  `preco_calc_no_ajuste_cent`, o calculado no momento do ajuste, para avisar se mudar depois.

## Receitas

- `receitas` + `receita_linhas` guardam **só quantidades** (e o valor das linhas livres). O nome, a
  unidade e o preço vêm do item atual (`LEFT JOIN items` em `SELECT_LINHA_RECEITA`).
- `aplicarReceita` copia as linhas para `orcamento_linhas` como se fossem adicionadas à mão
  (snapshot). Não fica ligação entre o bolo e a receita.
- A escala está em [src/domain/receitas.ts](../src/domain/receitas.ts) (`escalarLinhas`): só
  multiplica ingredientes.
- `receita_linhas.item_id` é `ON DELETE RESTRICT`: um item usado numa receita não pode ser apagado.
  `repo.apagarItem` e `repo.atualizarItem` (mudança de unidade) recusam antes, com mensagem legível,
  porque a quantidade está guardada na unidade do item.

## Estados e PDF

- Estados em [src/domain/estados.ts](../src/domain/estados.ts). A regra "partilhar um rascunho passa-o
  a enviado" (`estadoDepoisDePartilhar`) é aplicada pelo editor depois de a folha de partilha fechar.
  `passosSeguintes` diz que botões de ação mostrar no editor (ex.: enviado → "Aceitou").
  Os componentes (etiqueta, botões, diálogo de escolha) estão em [src/ui/Estado.tsx](../src/ui/Estado.tsx);
  o diálogo é o mesmo no editor e no toque longo da lista.
- PDF: [src/pdf/template.ts](../src/pdf/template.ts) gera o HTML (puro, testado, escapa o texto);
  [src/pdf/pdf.ts](../src/pdf/pdf.ts) chama `expo-print`, dá ao ficheiro um nome legível e abre a
  folha de partilha. Não há logótipo: o topo mostra o nome do negócio. A cor vem de
  [src/pdf/cores.ts](../src/pdf/cores.ts): oito conjuntos de quatro cores (principal, texto,
  secundária, linhas), testados para contraste ≥ 4,5:1 sobre branco. Na base guarda-se só o id
  (`definicoes.pdf_cor`); um id desconhecido usa a cor por omissão. Os contactos do negócio vão para
  o rodapé, formatados por `linhasContactos` (aceita "@nome", "nome" ou o link do perfil).

## Número, pedido e dados do cliente

- **Número** (`numero_ano` + `numero_seq`, único): atribuído em `repo.criarOrcamento`. O próximo é o
  maior entre `numeracao.ultimo` e o maior `numero_seq` do ano, mais 1, por isso apagar um
  orçamento ou importar um backup nunca faz repetir números. Formato em
  [src/domain/numero.ts](../src/domain/numero.ts) (`formatarNumero`); `numerarPorAno` aplica a regra
  da migração v3 aos backups antigos. O número é interno.
- **Referência para o cliente** ([src/domain/referencia.ts](../src/domain/referencia.ts)): o PDF, o
  texto e o nome do ficheiro levam `formatarReferencia` ("2026-QJQX") em vez do número, para o
  cliente não deduzir quantos orçamentos há. É uma permutação do número (rede de Feistel com o ano
  na chave), sem coluna na base: cada número tem um só código e vice-versa. A pesquisa converte a
  referência no número (`numeroDaReferencia`). **Nunca mudar a fórmula**: as referências já
  enviadas deixariam de bater certo (um teste fixa valores conhecidos).
- **Pedido** (`orcamentos.titulo`): só interno; `DadosPdf` e `DadosResumo` não o recebem.
- **Contactos** ([src/ui/EscolherContacto.tsx](../src/ui/EscolherContacto.tsx), `expo-contacts`):
  `Contact.presentPicker()` só devolve o id, por isso é preciso `READ_CONTACTS` para ler os números.
  `WRITE_CONTACTS` está em `android.blockedPermissions` no `app.json`. Os dados são copiados para o
  orçamento. Etiquetas e repetidos em [src/domain/contacto.ts](../src/domain/contacto.ts).
- **Calendário** ([src/ui/escolherData.ts](../src/ui/escolherData.ts)): `DateTimePickerAndroid.open`
  com o design por omissão (o Material 3 obrigaria a mudar o tema nativo).

## Idiomas

- Português, inglês, espanhol e francês, em [src/i18n/](../src/i18n/). Um só idioma para tudo:
  ecrãs, PDF, texto para o cliente e nome do ficheiro. Não há idioma por orçamento.
- `pt.ts` é a referência e define o tipo `Textos`; `en.ts`, `es.ts` e `fr.ts` têm de ter as mesmas
  chaves (o TypeScript verifica; `i18n.test.ts` verifica também as etiquetas e as cores e que não
  há textos vazios). Textos com valores são funções que recebem os valores já formatados.
- **Acrescentar um texto:** pô-lo nas quatro línguas e usar `textos().secção.chave`. Nunca deixar
  texto da interface escrito diretamente num ecrã.
- O idioma atual é global (`textos()`, `definirIdioma`). Fica em `definicoes.idioma` (`''` = o do
  telemóvel, lido com `expo-localization` em `dispositivo.ts`; outra língua cai no inglês). Aplica-se
  no `onInit` da base, antes do primeiro ecrã, e logo ao escolher nas Definições (não espera por
  "Guardar definições").
- Ao mudar de idioma, o `_layout.tsx` da raiz volta a montar a navegação (`key={idioma}`). Com o
  React Compiler, um componente podia guardar um preço ou texto já formatado no idioma antigo; montar
  de novo garante que nada fica para trás. Por isso os ecrãs chamam `textos()` sem hook.
- A formatação também segue o idioma (`textos().formato`): em inglês `€1,234.56` e `30%`; nos outros
  `1 234,56 €` e `30 %`. A leitura aceita vírgula ou ponto decimal em qualquer idioma. As datas são
  sempre dd/mm/aaaa.
- Na base guardam-se códigos, não textos: estados, unidades (`un`; o símbolo mostrado muda) e ids
  das cores. A exceção são os nomes por omissão dos bolos ("Bolo 1"): ficam no idioma em que foram
  criados, e `ehNomePorOmissaoBolo` reconhece-os em qualquer idioma.
- O nome da app no telemóvel ("Orçamentos de Bolos") não é traduzido.

## Base de dados

- [src/db/migrations.ts](../src/db/migrations.ts): lista de migrations SQL; a versão fica em
  `PRAGMA user_version`. Corre no arranque, via `SQLiteProvider onInit`.
- [src/db/repo.ts](../src/db/repo.ts): todas as queries, com tipos à mão.
- Não há ORM: com 8 tabelas, SQL direto é mais simples de ler e testar.
- `PRAGMA foreign_keys = ON`: apagar um orçamento apaga os bolos e as linhas (`ON DELETE CASCADE`);
  apagar um item deixa as linhas com `item_id = NULL`, mantendo o texto e o preço copiados.

### Acrescentar uma migration

1. Acrescentar uma string no **fim** de `MIGRATIONS`. Nunca alterar migrations já distribuídas.
2. Atualizar `TABELAS` em [src/backup/backup.ts](../src/backup/backup.ts). Um teste falha se as
   colunas do backup não baterem com o schema.
3. Acrescentar um passo a `ATUALIZAR_BACKUP` em `backup.ts`, para que backups da versão anterior
   continuem a importar (tabelas novas vazias, colunas novas obrigatórias preenchidas; colunas
   removidas são ignoradas sozinhas). Há um teste que importa um backup v1.
4. Acrescentar testes em `src/db/repo.test.ts` e registar a alteração no [CHANGELOG](../CHANGELOG.md).

Antes de migrar uma base existente, a app grava um backup JSON automático em
`<documentos da app>/backups/` (mantém os 10 mais recentes).

## Ecrãs

| Rota | Ficheiro |
| --- | --- |
| Histórico de orçamentos | `src/app/(tabs)/index.tsx` |
| Receitas | `src/app/(tabs)/receitas.tsx` |
| Catálogo | `src/app/(tabs)/catalogo.tsx` |
| Definições e backup | `src/app/(tabs)/definicoes.tsx` |
| Item do catálogo | `src/app/item/[id].tsx` (`id = "novo"` para criar) |
| Editor de orçamento | `src/app/orcamento/[id].tsx` + `src/ui/BoloCard.tsx` |
| Linha de um bolo | `src/app/orcamento/linha.tsx` (`boloId`, `boloId + livre`, ou `linhaId`) |
| Receita num bolo | `src/app/orcamento/receita.tsx` (`boloId`) |
| Editor de receita | `src/app/receita/[id].tsx` |
| Linha de uma receita | `src/app/receita/linha.tsx` (`receitaId`, `receitaId + livre`, ou `linhaId`) |

Os formulários de linha (escolher item, quantidade, linha livre) são partilhados entre bolos e
receitas: [src/ui/FormulariosLinha.tsx](../src/ui/FormulariosLinha.tsx).

Padrões:

- **Sem estado global.** Cada ecrã lê da base em `useFocusEffect`, por isso recarrega ao voltar de
  outro ecrã.
- **Os editores de orçamento e de receita guardam ao sair de cada campo** (`CampoAutoGuardado`). O
  campo devolve uma mensagem de erro quando o valor não é válido, e nesse caso não guarda.
- **Gestor de gravação** ([src/ui/Guardar.tsx](../src/ui/Guardar.tsx)): cada editor cria um com
  `useGestorGuardar()` e envolve o conteúdo no `GestorGuardar.Provider`. Os campos gravam através
  dele e registam-se, para que o botão **Concluído** guarde o campo ainda em edição e espere pelas
  gravações em curso. O cabeçalho é desenhado fora do Provider, por isso recebe o gestor por props.
  Botões que gravam (chips de estado, "Repor calculado", apagar bolo) usam `gestor.executar`.
- Confirmações curtas de sucesso com `avisar()` (Toast do Android). Ações destrutivas ficam no menu
  ⋮ (`MenuMais`) e pedem sempre confirmação.
- Textos da interface em [src/i18n/](../src/i18n/) (ver [Idiomas](#idiomas)), em todas as línguas sem
  assumir o género de quem usa a app.
- Cores em [src/ui/theme.ts](../src/ui/theme.ts): paleta do tema, `corCabecalho` e `COR_ESTADO`
  (cor e ícone de cada estado). As listas principais usam `CartaoLista`
  ([src/ui/CartaoLista.tsx](../src/ui/CartaoLista.tsx)).
- Ícones da app: gerados a partir de `assets/icon.png` (PNG quadrado, fundo transparente) para
  `assets/images/` (ícone, ícone adaptativo do Android com primeiro plano a 60 % do lado,
  monocromático, ecrã de arranque, favicon e `logo.png` do cabeçalho).

## Testes

- Jest + ts-jest, só para código sem React Native (`jest.config.js`).
- `src/db/testDb.ts` adapta o `node:sqlite` à API do expo-sqlite usada (`execAsync`, `runAsync`,
  `getFirstAsync`, `getAllAsync`, `withTransactionAsync`). Ao usar outro método do expo-sqlite em
  `repo.ts`, acrescentá-lo também ao adaptador.
- Interface: verificação manual com [testes-manuais.md](testes-manuais.md). Se a interface crescer,
  considerar testes E2E com Maestro.

## Decisões técnicas

| Decisão | Motivo | Rever se… |
| --- | --- | --- |
| Expo + React Native, sem pastas nativas no repositório | Build no EAS; sem Android Studio | for preciso código nativo próprio |
| expo-sqlite com SQL direto, sem ORM | Poucas tabelas; mais fácil de testar com `node:sqlite` | o schema crescer muito |
| React Native Paper | Componentes Material prontos | — |
| Sem biblioteca de estado nem de formulários | Os dados vivem no SQLite; os formulários são pequenos | houver formulários grandes ou partilha de estado entre ecrãs |
| Distribuição por APK, sem Play Store | Uma só pessoa a usar | houver mais utilizadores; o EAS também gera AAB |
| Backup manual pela folha de partilha | Sem backend; quem usa a app escolhe o destino | se quiser backup automático para a nuvem |
