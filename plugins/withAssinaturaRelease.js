/**
 * Config plugin: assina o APK de release com a keystore da app quando o build é feito no PC
 * (`npx expo prebuild` + `./gradlew assembleRelease`). Ver docs/release.md, "Build local".
 *
 * - Os dados da keystore vêm de `~/.gradle/gradle.properties` (nunca do repositório):
 *     ORCAMENTOS_UPLOAD_STORE_FILE=C:/Users/<utilizador>/.android-keys/orcamentos-bolos.jks
 *     ORCAMENTOS_UPLOAD_KEY_ALIAS=...
 *     ORCAMENTOS_UPLOAD_STORE_PASSWORD=...
 *     ORCAMENTOS_UPLOAD_KEY_PASSWORD=...
 * - No EAS (variável EAS_BUILD) não muda nada: o EAS injeta a keystore guardada na conta.
 * - Sem essas propriedades e fora do EAS, um build de release falha, em vez de sair assinado com
 *   a chave de debug (um APK assim não instala por cima da versão anterior).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARCA = '// @orcamentos-assinatura-release';

const CONFIG_ASSINATURA = `
        ${MARCA}
        orcamentosRelease {
            if (project.hasProperty('ORCAMENTOS_UPLOAD_STORE_FILE')) {
                storeFile file(ORCAMENTOS_UPLOAD_STORE_FILE)
                storePassword ORCAMENTOS_UPLOAD_STORE_PASSWORD
                keyAlias ORCAMENTOS_UPLOAD_KEY_ALIAS
                keyPassword ORCAMENTOS_UPLOAD_KEY_PASSWORD
            }
        }`;

const ESCOLHA_RELEASE = `if (project.hasProperty('ORCAMENTOS_UPLOAD_STORE_FILE')) {
                signingConfig signingConfigs.orcamentosRelease
            } else {
                signingConfig signingConfigs.debug
            }`;

const VERIFICACAO = `

${MARCA}
gradle.taskGraph.whenReady { grafo ->
    def release = grafo.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }
    if (release && !project.hasProperty('ORCAMENTOS_UPLOAD_STORE_FILE') && !System.getenv('EAS_BUILD')) {
        throw new GradleException(
            'Falta a keystore da app: defina ORCAMENTOS_UPLOAD_* em ~/.gradle/gradle.properties ' +
            '(ver docs/release.md, Build local).')
    }
}
`;

function aplicar(gradle) {
  if (gradle.includes(MARCA)) return gradle;

  const comConfig = gradle.replace(/signingConfigs\s*\{/, (m) => m + CONFIG_ASSINATURA);
  const release = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (comConfig === gradle || !release.test(comConfig)) {
    throw new Error(
      'withAssinaturaRelease: o android/app/build.gradle gerado mudou de formato; rever o plugin.',
    );
  }
  return comConfig.replace(release, (_m, antes) => antes + ESCOLHA_RELEASE) + VERIFICACAO;
}

module.exports = function withAssinaturaRelease(config) {
  return withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== 'groovy') {
      throw new Error('withAssinaturaRelease: só suporta build.gradle em Groovy.');
    }
    c.modResults.contents = aplicar(c.modResults.contents);
    return c;
  });
};

module.exports.aplicar = aplicar;
