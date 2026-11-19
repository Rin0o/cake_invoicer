## O que muda

<!-- Uma ou duas frases. Ligar à issue, se existir. -->

## Verificação

- [ ] `npm run check` passa
- [ ] Testes novos/atualizados para alterações em `src/domain`, `src/db`, `src/backup` ou `src/share`
- [ ] Testado no telemóvel (secções relevantes de `docs/testes-manuais.md`)
- [ ] `CHANGELOG.md` atualizado em *Por lançar* (se a alteração for visível para quem usa a app)

## Se mexer na base de dados

- [ ] Migration nova no fim de `MIGRATIONS` (nenhuma migration existente foi alterada)
- [ ] `TABELAS` em `src/backup/backup.ts` atualizado
- [ ] Registado no CHANGELOG em *Schema da base de dados*
