import { COR_PDF_POR_OMISSAO, CORES_PDF, corPdf } from '@/pdf/cores';

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrasteComBranco = (hex: string) => 1.05 / (luminancia(hex) + 0.05);

describe('cores do PDF', () => {
  it.each(CORES_PDF.map((c) => [c.nome, c] as const))('%s é legível sobre papel branco', (_nome, c) => {
    expect(contrasteComBranco(c.principal)).toBeGreaterThanOrEqual(4.5);
    expect(contrasteComBranco(c.texto)).toBeGreaterThanOrEqual(4.5);
    expect(contrasteComBranco(c.secundaria)).toBeGreaterThanOrEqual(4.5);
  });

  it('tem ids únicos e cores em #RRGGBB', () => {
    expect(new Set(CORES_PDF.map((c) => c.id)).size).toBe(CORES_PDF.length);
    for (const c of CORES_PDF) {
      for (const hex of [c.principal, c.texto, c.secundaria, c.linhas]) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('a cor por omissão existe e um id desconhecido cai nela', () => {
    expect(CORES_PDF.some((c) => c.id === COR_PDF_POR_OMISSAO)).toBe(true);
    expect(corPdf('lilas').nome).toBe('Lilás');
    expect(corPdf('nao-existe').id).toBe(COR_PDF_POR_OMISSAO);
  });
});
