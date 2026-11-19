# Changelog

Todas as alterações relevantes da app ficam registadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
o [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR**: alteração que obriga a quem usa a app a fazer algo (ex.: backups antigos deixam de importar).
- **MINOR**: funcionalidade nova.
- **PATCH**: correção.

Cada versão distribuída tem também um `android.versionCode` (em `app.json`) maior do que o da anterior.

## [Por lançar]

## [1.0.0] — MVP

Primeira versão (fase 1 da especificação).

### Adicionado

- Catálogo de ingredientes e materiais com preço por kg, litro ou unidade; pesquisa; desativar e apagar itens.
- Definições: valor/hora, custos indiretos, margem por omissão, nome e contacto do negócio.
- Orçamentos com cliente, contacto, data de entrega, notas internas e margem própria.
- Vários bolos por orçamento, cada um com linhas do catálogo (quantidade em g/kg, ml/l ou un),
  linhas livres e tempo de trabalho (aceita `2h30`, `2:30` ou `150`).
- Cálculo por bolo: materiais × (1 + margem) + tempo + indiretos, arredondado ao euro.
  O total é a soma dos bolos.
- Preço final de cada bolo editável, com "Repor calculado", aviso quando o calculado muda e
  aviso quando o preço fica abaixo do custo.
- Preços, valor/hora e percentagens copiados para o orçamento: mudar o catálogo ou as
  definições não altera orçamentos existentes.
- Lista de orçamentos com pesquisa por cliente.
- Partilha do orçamento em texto (WhatsApp, SMS, email…), só com os preços finais.
- Backup: exportar e restaurar toda a base em JSON; backup automático antes de migrar a base.

### Schema da base de dados

- v1: `items`, `definicoes`, `orcamentos`, `orcamento_bolos`, `orcamento_linhas`.

[Por lançar]: https://github.com/Rin0o/cake_invoicer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Rin0o/cake_invoicer/releases/tag/v1.0.0
