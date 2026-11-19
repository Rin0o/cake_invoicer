/**
 * Protege contra texto com a codificação estragada (ex.: "PreÃ§o" em vez de "Preço"),
 * que acontece quando um ficheiro UTF-8 é lido como Windows-1252 e gravado outra vez.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { readdirSync, readFileSync, statSync } = require('node:fs') as {
  readdirSync: (d: string) => string[];
  readFileSync: (f: string, c: 'utf8') => string;
  statSync: (f: string) => { isDirectory: () => boolean };
};
const { join } = require('node:path') as { join: (...p: string[]) => string };
declare const __dirname: string;
declare const __filename: string;

function ficheiros(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return ficheiros(caminho);
    return /\.(ts|tsx|md)$/.test(nome) ? [caminho] : [];
  });
}

describe('codificação dos ficheiros', () => {
  const raiz = join(__dirname, '..');
  const lista = [...ficheiros(join(raiz, 'src')), ...ficheiros(join(raiz, 'docs'))].filter((f) => f !== __filename);

  it.each(lista)('%s está em UTF-8 sem caracteres estragados nem BOM', (caminho) => {
    const texto = readFileSync(caminho, 'utf8');
    expect(texto.charCodeAt(0)).not.toBe(0xfeff);
    // Sequências típicas de UTF-8 lido como Windows-1252: "Ã§", "Ã£", "â‚¬", "Ã—"…
    expect(texto).not.toMatch(/Ã[\u0080-¿–-›]|â€|â‚¬|�/);
  });
});
