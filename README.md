# CakeForCash

[![CI](https://github.com/Rin0o/cake_invoicer/actions/workflows/ci.yml/badge.svg)](https://github.com/Rin0o/cake_invoicer/actions/workflows/ci.yml)

**CakeForCash** (antes *Orçamentos de Bolos*) é uma app Android para calcular orçamentos de bolos
por encomenda. Funciona sem internet e guarda tudo
no telemóvel.

- Catálogo de ingredientes e materiais com preço por kg, litro ou unidade.
- Receitas reutilizáveis, aplicadas a um bolo com escala (ex.: 1,5×).
- Orçamentos com vários bolos: quantidade usada de cada item, tempo de trabalho, custos indiretos e margem.
- Preço final de cada bolo editável, com opção de repor o valor calculado.
- Cada orçamento tem um número interno (`2026-014`), uma referência para o cliente que não revela
  quantos orçamentos há (`2026-QJQX`) e um título interno do pedido; o cliente pode vir dos
  contactos do telemóvel e a data de entrega escolhe-se no calendário.
- Estados (rascunho, enviado, aceite, recusado, entregue), com listas separadas de abertos,
  entregues e recusados, pesquisa e filtro.
- Envio ao cliente em PDF (com o nome, a cor e os contactos do negócio) ou em texto, por WhatsApp,
  SMS ou email.
- Em português, inglês, espanhol e francês (ecrãs, PDF e texto para o cliente).
- Backup e restauro em JSON.

Versão atual: **1.0.0** (ver o [CHANGELOG](CHANGELOG.md)). Ideias para as próximas (rever o PDF,
logótipo próprio…) na
[especificação](Especificação%20—%20App%20de%20Orçamentação%20de%20Bolos.md#7-plano-de-rollout).

| Documento | Conteúdo |
| --- | --- |
| [Especificação](Especificação%20—%20App%20de%20Orçamentação%20de%20Bolos.md) | Requisitos, modelo de dados, regras de cálculo, plano de fases |
| [docs/arquitetura.md](docs/arquitetura.md) | Como o código está organizado e porquê |
| [docs/release.md](docs/release.md) | Como gerar e distribuir uma versão nova (APK) |
| [docs/testes-manuais.md](docs/testes-manuais.md) | Lista de verificação no telemóvel antes de cada versão |
| [CHANGELOG.md](CHANGELOG.md) | Alterações por versão |

## Requisitos

- Node.js 24 (ver [.nvmrc](.nvmrc); mínimo 22.13, por causa do `node:sqlite` usado nos testes)
- Um telemóvel Android com a app **Expo Go**, ou um emulador Android
- Para gerar o APK: uma conta gratuita em [expo.dev](https://expo.dev) (build no EAS), ou o
  Android SDK, um JDK e a keystore da app (build local, ver [docs/release.md](docs/release.md))

## Começar

```bash
npm install
npx expo start
```

Ler o QR code com o Expo Go. O telemóvel e o computador têm de estar na mesma rede Wi-Fi
(se não der, `npx expo start --tunnel`).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento (Expo) |
| `npm run check` | Tipos + lint + testes; correr antes de cada commit |
| `npm test` | Testes unitários (Jest) |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run test:coverage` | Testes com relatório de cobertura em `coverage/` |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm run lint` | ESLint (configuração Expo) |
| `npm run build:apk` | Gera o APK no EAS (ver [docs/release.md](docs/release.md)) |

## Testes

Os testes automáticos cobrem tudo o que não é interface:

- `src/domain/`: cálculo de preços, arredondamento, conversões de unidades, leitura de valores
  escritos (euros, tempo, datas). Exige cobertura ≥ 95 %.
- `src/db/`: migrations e queries, contra uma base SQLite real em memória (`node:sqlite`, através
  do adaptador [src/db/testDb.ts](src/db/testDb.ts)).
- `src/backup/`, `src/share/`, `src/pdf/template.ts`: exportar/restaurar, e o texto e o PDF
  enviados ao cliente.
- `src/i18n/`: os quatro idiomas têm todos os textos, sem nenhum vazio.

Os ecrãs são verificados à mão com [docs/testes-manuais.md](docs/testes-manuais.md).

## CI

O GitHub Actions corre a cada push para `main` e em cada pull request
([.github/workflows/ci.yml](.github/workflows/ci.yml)): tipos, lint, testes com cobertura,
`expo-doctor` e um bundle Android de verificação.

O workflow [Build APK](.github/workflows/build-apk.yml) gera o APK no EAS. Corre à mão ou ao
publicar uma tag `vX.Y.Z`, e precisa do secret `EXPO_TOKEN`.

## Estrutura

```
src/
  app/          ecrãs (Expo Router; cada ficheiro é uma rota)
  domain/       lógica pura e testada (preços, unidades, formatação)
  db/           schema versionado e queries
  backup/       exportar/importar JSON
  pdf/          PDF para o cliente
  share/        texto para o cliente
  i18n/         textos da interface em pt, en, es e fr
  ui/           componentes partilhados, tema e banner de abertura
plugins/        config plugin que assina o APK no build local
docs/           documentação de desenvolvimento
```

Detalhes em [docs/arquitetura.md](docs/arquitetura.md).

## Dados e segurança

Os dados só existem no telemóvel. Não há servidor nem conta.

- Desinstalar a app **apaga os dados**. Atualizar instalando o APK novo por cima mantém-nos.
- A keystore que assina o APK tem de ser sempre a mesma. Ver [docs/release.md](docs/release.md#keystore).
- A pessoa que usa a app deve exportar um backup com regularidade (*Definições → Exportar backup*)
  e guardá-lo fora do telemóvel.
