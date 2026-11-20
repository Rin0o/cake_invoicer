import {
  codigoReferencia,
  formatarReferencia,
  lerPesquisaReferencia,
  numeroDaReferencia,
} from './referencia';

const n = (numero_seq: number, numero_ano = 2026) => ({ numero_ano, numero_seq });

describe('referência do orçamento', () => {
  it('tem o ano e 4 carateres sem 0, O, 1, I nem L', () => {
    for (let s = 1; s <= 500; s++) expect(formatarReferencia(n(s))).toMatch(/^2026-[2-9A-HJKMNP-Z]{4}$/);
  });

  it('é sempre a mesma para o mesmo número (as já enviadas não podem mudar)', () => {
    // Valores fixos: se este teste falhar, a fórmula mudou e as referências já enviadas deixam de bater certo.
    expect([1, 2, 3, 14, 999].map((s) => formatarReferencia(n(s)))).toMatchInlineSnapshot(`
[
  "2026-QJQX",
  "2026-95G5",
  "2026-M69B",
  "2026-YF82",
  "2026-KQ3Y",
]
`);
    expect(formatarReferencia(n(1, 2027))).toMatchInlineSnapshot(`"2027-VTJ9"`);
  });

  it('não se repete dentro do ano', () => {
    const vistos = new Set<string>();
    for (let s = 1; s <= 20000; s++) vistos.add(codigoReferencia(n(s)));
    expect(vistos.size).toBe(20000);
  });

  it('muda com o ano', () => {
    expect(codigoReferencia(n(1, 2026))).not.toBe(codigoReferencia(n(1, 2027)));
  });

  it('números seguidos não têm carateres em comum na mesma posição com frequência', () => {
    // Uma permutação fraca (ex.: somar uma constante) deixaria os primeiros carateres iguais.
    let iguais = 0;
    for (let s = 1; s < 1000; s++) {
      const a = codigoReferencia(n(s));
      const b = codigoReferencia(n(s + 1));
      for (let i = 0; i < 4; i++) if (a[i] === b[i]) iguais++;
    }
    // ao acaso, ~1/31 das posições coincide: ~129 em 3996
    expect(iguais).toBeLessThan(250);
  });

  it('volta ao número a partir do código e do ano', () => {
    for (const s of [1, 2, 3, 14, 999, 12345, 923520]) {
      expect(numeroDaReferencia(codigoReferencia(n(s)), 2026)).toEqual(n(s));
    }
    expect(numeroDaReferencia(codigoReferencia(n(7)).toLowerCase(), 2026)).toEqual(n(7));
  });

  it('recusa códigos inválidos e sequências fora do intervalo', () => {
    expect(numeroDaReferencia('K0QM', 2026)).toBeNull(); // 0 não faz parte do alfabeto
    expect(numeroDaReferencia('ABC', 2026)).toBeNull();
    expect(() => codigoReferencia(n(0))).toThrow();
    expect(() => codigoReferencia(n(923521))).toThrow();
  });
});

describe('lerPesquisaReferencia', () => {
  it('aceita "2026-K7QM", "2026 - k7qm" e "K7QM"', () => {
    expect(lerPesquisaReferencia('2026-K7QM')).toEqual({ codigo: 'K7QM', ano: 2026 });
    expect(lerPesquisaReferencia(' 2026 - k7qm ')).toEqual({ codigo: 'K7QM', ano: 2026 });
    expect(lerPesquisaReferencia('K7QM')).toEqual({ codigo: 'K7QM', ano: null });
  });

  it('ignora texto que não pode ser uma referência', () => {
    expect(lerPesquisaReferencia('Rita')).toBeNull(); // tem I
    expect(lerPesquisaReferencia('2026-001')).toBeNull();
    expect(lerPesquisaReferencia('Ana Silva')).toBeNull();
    expect(lerPesquisaReferencia('')).toBeNull();
  });
});
