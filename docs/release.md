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

### Opção C — build local, sem EAS (mais rápido)

Requer o Android SDK e um JDK (ex.: 17 ou 21, com `JAVA_HOME` e `ANDROID_HOME` definidos) e
**a mesma keystore do EAS**. Com outra keystore, o APK não instala por cima da versão anterior.

Configuração (uma vez por computador):

1. Descarregar a keystore: `npx eas-cli@latest credentials -p android` → perfil `apk` →
   *credentials.json* → *Download credentials from EAS to credentials.json*.
2. Mover o `.jks` para fora do projeto (ex.: `~/.android-keys/orcamentos-bolos.jks`) e guardar
   o `credentials.json` com ele (tem as passwords). Os dois estão no `.gitignore`; nunca os commitar.
3. Acrescentar a `~/.gradle/gradle.properties` (fora do repositório), com os valores do
   `credentials.json`:
   ```properties
   ORCAMENTOS_UPLOAD_STORE_FILE=C:/Users/<utilizador>/.android-keys/orcamentos-bolos.jks
   ORCAMENTOS_UPLOAD_KEY_ALIAS=<keyAlias>
   ORCAMENTOS_UPLOAD_STORE_PASSWORD=<keystorePassword>
   ORCAMENTOS_UPLOAD_KEY_PASSWORD=<keyPassword>
   ```

O config plugin [plugins/withAssinaturaRelease.js](../plugins/withAssinaturaRelease.js) usa
estes valores para assinar o release. Sem eles, `assembleRelease` falha de propósito, em vez de
gerar um APK assinado com a chave de debug. No EAS o plugin não muda nada.

Gerar o APK:

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

O APK fica em `android/app/build/outputs/apk/release/app-release.apk`. O `prebuild` muda o
script `android` em `package.json`; repor com `git checkout -- package.json`.

**Windows:** a compilação nativa (ex.: `react-native-reanimated`) falha com
`ninja: error: mkdir(...): No such file or directory`, por causa dos caminhos longos. O CMake
3.22.1 usado por omissão traz o ninja 1.10, que não os suporta. Solução:

1. Caminhos longos ativos no Windows (`LongPathsEnabled = 1` em
   `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem`; pede administrador).
2. Instalar o CMake 3.31.6 (Android Studio → SDK Manager → SDK Tools → CMake), que traz o ninja 1.12.
3. Depois de cada `prebuild --clean`, acrescentar a `android/local.properties` (ficheiro local,
   fora do git):
   ```properties
   cmake.dir=C:\\Users\\<utilizador>\\AppData\\Local\\Android\\Sdk\\cmake\\3.31.6
   ```

Não usar `subst` para encurtar o caminho: o autolinking da Expo não encontra o `package.json`
quando o projeto fica na raiz de uma unidade.

O primeiro build demora uns 15 minutos (compila o código nativo para 4 arquiteturas); os seguintes
reaproveitam a cache e são mais rápidos. O APK tem cerca de 100 MB.

As pastas `android/` e `ios/` são geradas e estão no `.gitignore`; não as editar à mão (a
assinatura vem do plugin).

**Onde está a keystore:** EAS (conta Expo) e uma cópia em `~/.android-keys/` no computador de
desenvolvimento. Guardar também uma cópia num gestor de passwords (ver *Keystore*, abaixo).

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
