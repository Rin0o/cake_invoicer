# Orçamentos de Bolos

[![CI](https://github.com/Rin0o/cake_invoicer/actions/workflows/ci.yml/badge.svg)](https://github.com/Rin0o/cake_invoicer/actions/workflows/ci.yml)

App Android para calcular orçamentos de bolos por encomenda. Funciona sem internet e guarda tudo
no telemóvel.

- Catálogo de ingredientes e materiais com preço por kg, litro ou unidade.
- Orçamentos com vários bolos: quantidade usada de cada item, tempo de trabalho, custos indiretos e margem.
- Preço final de cada bolo editável, com opção de repor o valor calculado.
- Partilha do orçamento por WhatsApp, SMS ou email.
- Backup e restauro em JSON.

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
- Para gerar o APK: uma conta gratuita em [expo.dev](https://expo.dev)

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
- `src/backup/`, `src/share/`: exportar/restaurar e o texto enviado ao cliente.

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
  share/        texto para o cliente
  ui/           componentes partilhados e tema
docs/           documentação de desenvolvimento
```

Detalhes em [docs/arquitetura.md](docs/arquitetura.md).

## Dados e segurança

Os dados só existem no telemóvel. Não há servidor nem conta.

- Desinstalar a app **apaga os dados**. Atualizar instalando o APK novo por cima mantém-nos.
- A keystore que assina o APK tem de ser sempre a mesma. Ver [docs/release.md](docs/release.md#keystore).
- A pessoa que usa a app deve exportar um backup com regularidade (*Definições → Exportar backup*)
  e guardá-lo fora do telemóvel.
