# Lançar uma versão

A app é distribuída como APK, instalado diretamente no telemóvel (sem Play Store).

## Lista de verificação

1. `main` está verde no CI.
2. Atualizar a versão:
   - `app.json` → `expo.version` (ex.: `1.1.0`), seguindo o [CHANGELOG](../CHANGELOG.md#changelog);
   - `app.json` → `expo.android.versionCode`: **sempre +1** (o Android recusa instalar um APK com
     `versionCode` igual ou menor por cima de outro);
   - `package.json` → `version`, igual a `expo.version`.
3. No [CHANGELOG.md](../CHANGELOG.md), passar o conteúdo de *Por lançar* para a nova versão, com a data.
4. Se houver migration nova, confirmar que está registada no CHANGELOG em *Schema da base de dados*.
5. Commit `chore: versão X.Y.Z`, tag e push:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```
6. Gerar o APK (abaixo).
7. Correr [testes-manuais.md](testes-manuais.md) com o APK, num telemóvel com dados da versão anterior.
8. Enviar o APK a quem usa a app, com instruções:
   1. *Definições → Exportar backup* e guardar o ficheiro fora do telemóvel.
   2. Abrir o APK e instalar **por cima** (não desinstalar a versão antiga).

## Gerar o APK

### Opção A — GitHub Actions

O push da tag `vX.Y.Z` lança o workflow **Build APK**, que também pode ser corrido à mão em
*Actions → Build APK → Run workflow*. O APK aparece em [expo.dev](https://expo.dev), no projeto,
em *Builds*.

Configuração (uma vez só): criar um token em *expo.dev → Account settings → Access tokens* e
guardá-lo como secret `EXPO_TOKEN` em *GitHub → Settings → Secrets and variables → Actions*.

### Opção B — no computador

```bash
npx eas-cli@latest login
npm run build:apk
```

A primeira vez, o EAS pergunta se deve ligar o projeto à conta (cria `extra.eas.projectId` em
`app.json`, que deve ser commitado) e se deve gerar uma keystore (responder sim).

### Opção C — build local, sem EAS

Requer o Android SDK e uma keystore própria:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

As pastas `android/` e `ios/` são geradas e estão no `.gitignore`; não as editar à mão.

## Keystore

O Android só aceita atualizar uma app se o APK novo estiver assinado com **a mesma chave** do anterior.

- Com o EAS, a keystore fica guardada na conta Expo (`npx eas-cli@latest credentials` para ver ou
  descarregar). **Descarregar uma cópia** e guardá-la num local seguro (gestor de passwords,
  disco cifrado). Nunca a commitar (o `.gitignore` já exclui `*.jks`).
- Se a chave se perder, a versão nova só instala depois de desinstalar a antiga, e isso **apaga
  todos os dados**. Nesse caso: exportar o backup, desinstalar, instalar e restaurar o backup.

## Development build

Se o Expo Go deixar de servir (versão de SDK diferente, ou um módulo nativo que não vem incluído):

```bash
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
```
