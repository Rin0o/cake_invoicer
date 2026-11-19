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
| `src/domain/` | Cálculo de preços, unidades, leitura e formatação de valores | Nada de fora de `domain/` |
| `src/db/` | Schema, migrations, queries; mantém os totais guardados certos | `domain/`, `backup/` (migrations) |
| `src/backup/`, `src/share/` | Exportar/importar JSON; texto para o cliente | `domain/`, módulos Expo |
| `src/ui/` | Componentes partilhados, tema, diálogos | `db/`, `domain/` |
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
- Preço editado à mão: `orcamento_bolos.preco_final_cent` (`null` = usa o calculado). Guarda-se também
  `preco_calc_no_ajuste_cent`, o calculado no momento do ajuste, para avisar se mudar depois.

## Base de dados

- [src/db/migrations.ts](../src/db/migrations.ts): lista de migrations SQL; a versão fica em
  `PRAGMA user_version`. Corre no arranque, via `SQLiteProvider onInit`.
- [src/db/repo.ts](../src/db/repo.ts): todas as queries, com tipos à mão.
- Não há ORM: com 5 tabelas, SQL direto é mais simples de ler e testar.
- `PRAGMA foreign_keys = ON`: apagar um orçamento apaga os bolos e as linhas (`ON DELETE CASCADE`);
  apagar um item deixa as linhas com `item_id = NULL`, mantendo o texto e o preço copiados.

### Acrescentar uma migration

1. Acrescentar uma string no **fim** de `MIGRATIONS`. Nunca alterar migrations já distribuídas.
2. Atualizar `TABELAS` em [src/backup/backup.ts](../src/backup/backup.ts). Um teste falha se as
   colunas do backup não baterem com o schema.
3. Decidir o que fazer com backups de versões antigas (hoje `validarBackup` só aceita a versão
   atual; ver o `TODO`). Uma solução simples: importar para uma base temporária na versão antiga
   e correr as migrations.
4. Acrescentar testes em `src/db/repo.test.ts` e registar a alteração no [CHANGELOG](../CHANGELOG.md).

Antes de migrar uma base existente, a app grava um backup JSON automático em
`<documentos da app>/backups/` (mantém os 10 mais recentes).

## Ecrãs

| Rota | Ficheiro |
| --- | --- |
| Lista de orçamentos | `src/app/(tabs)/index.tsx` |
| Catálogo | `src/app/(tabs)/catalogo.tsx` |
| Definições e backup | `src/app/(tabs)/definicoes.tsx` |
| Item do catálogo | `src/app/item/[id].tsx` (`id = "novo"` para criar) |
| Editor de orçamento | `src/app/orcamento/[id].tsx` + `src/ui/BoloCard.tsx` |
| Linha de um bolo | `src/app/orcamento/linha.tsx` (`boloId`, `boloId + livre`, ou `linhaId`) |

Padrões:

- **Sem estado global.** Cada ecrã lê da base em `useFocusEffect`, por isso recarrega ao voltar de
  outro ecrã.
- **O editor do orçamento guarda ao sair de cada campo** (`CampoAutoGuardado`). O campo devolve uma
  mensagem de erro quando o valor não é válido, e nesse caso não guarda.
- Textos da interface em português de Portugal, sem assumir o género de quem usa a app.

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
