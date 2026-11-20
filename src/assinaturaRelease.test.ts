/**
 * Config plugin de assinatura do release (plugins/withAssinaturaRelease.js), aplicado a um
 * excerto do android/app/build.gradle gerado pelo `expo prebuild`.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { aplicar } = require('../plugins/withAssinaturaRelease') as { aplicar: (g: string) => string };

const GRADLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('withAssinaturaRelease', () => {
  it('o release usa a keystore de gradle.properties; o debug fica igual', () => {
    const r = aplicar(GRADLE);
    expect(r).toContain('orcamentosRelease {');
    expect(r).toContain('storeFile file(ORCAMENTOS_UPLOAD_STORE_FILE)');
    expect(r).toMatch(/release \{\s+if \(project\.hasProperty\('ORCAMENTOS_UPLOAD_STORE_FILE'\)\) \{\s+signingConfig signingConfigs\.orcamentosRelease/);
    expect(r).toMatch(/debug \{\s+signingConfig signingConfigs\.debug\s+\}/);
    expect(r).toContain("System.getenv('EAS_BUILD')");
  });

  it('aplicar duas vezes não duplica', () => {
    const uma = aplicar(GRADLE);
    expect(aplicar(uma)).toBe(uma);
  });

  it('falha se o build.gradle mudar de formato', () => {
    expect(() => aplicar('android { }')).toThrow('mudou de formato');
  });
});
