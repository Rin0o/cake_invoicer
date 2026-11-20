import { formatarNumero, numerarPorAno, ultimosPorAno } from './numero';

describe('formatarNumero', () => {
  it('ano-sequência com 3 dígitos, e cresce além de 999', () => {
    expect(formatarNumero({ numero_ano: 2026, numero_seq: 14 })).toBe('2026-014');
    expect(formatarNumero({ numero_ano: 2026, numero_seq: 1000 })).toBe('2026-1000');
  });
});

describe('numerarPorAno', () => {
  it('numera por ordem de criação dentro de cada ano, mantendo a ordem original', () => {
    const r = numerarPorAno([
      { id: 3, criado_em: '2026-12-01T10:00:00.000Z' },
      { id: 1, criado_em: '2026-11-01T10:00:00.000Z' },
      { id: 4, criado_em: '2027-01-02T10:00:00.000Z' },
      { id: 2, criado_em: '2026-11-01T10:00:00.000Z' },
    ]);
    expect(r.map((o) => [o.id, formatarNumero(o)])).toEqual([
      [3, '2026-003'],
      [1, '2026-001'],
      [4, '2027-001'],
      [2, '2026-002'],
    ]);
  });
});

describe('ultimosPorAno', () => {
  it('maior número de cada ano', () => {
    expect(
      ultimosPorAno([
        { numero_ano: 2027, numero_seq: 1 },
        { numero_ano: 2026, numero_seq: 2 },
        { numero_ano: 2026, numero_seq: 5 },
      ]),
    ).toEqual([
      { ano: 2026, ultimo: 5 },
      { ano: 2027, ultimo: 1 },
    ]);
  });
});
