import { arredondarAoEuro, calcularBolo, calcularOrcamento, valorLinha } from './pricing';
import { paraUnidadeItem } from './units';

const params = { valorHoraCent: 1000, indiretoPct: 10, margemPct: 30 };

describe('valorLinha', () => {
  it('multiplica a quantidade na unidade do item pelo preço por unidade', () => {
    // farinha a 1,20 €/kg, 300 g usadas
    const q = paraUnidadeItem(300, 'g', 'kg');
    expect(valorLinha({ quantidade: q, precoUnitCent: 120 })).toBeCloseTo(36);
  });

  it('funciona com ml e unidades', () => {
    expect(valorLinha({ quantidade: paraUnidadeItem(250, 'ml', 'l'), precoUnitCent: 200 })).toBeCloseTo(50);
    expect(valorLinha({ quantidade: 6, precoUnitCent: 25 })).toBe(150);
  });
});

describe('arredondarAoEuro', () => {
  it('arredonda ao euro mais próximo', () => {
    expect(arredondarAoEuro(1249)).toBe(1200);
    expect(arredondarAoEuro(1251)).toBe(1300);
    expect(arredondarAoEuro(0)).toBe(0);
  });

  it('0,50 arredonda para cima', () => {
    expect(arredondarAoEuro(1250)).toBe(1300);
    expect(arredondarAoEuro(50)).toBe(100);
  });

  it('não é enganado por erros de vírgula flutuante', () => {
    expect(arredondarAoEuro(1249.9999999999)).toBe(1300);
  });
});

describe('calcularBolo', () => {
  it('aplica a margem só aos materiais e os indiretos a materiais + tempo', () => {
    // materiais 10,00 €, 60 min a 10 €/h = 10,00 €
    const r = calcularBolo(
      { linhas: [{ quantidade: 1, precoUnitCent: 1000 }], tempoMin: 60, precoFinalCent: null },
      params,
    );
    expect(r.materiaisCent).toBeCloseTo(1000);
    expect(r.tempoCent).toBeCloseTo(1000);
    expect(r.indiretosCent).toBeCloseTo(200); // 10 % de 20 €
    expect(r.margemCent).toBeCloseTo(300); // 30 % de 10 €, não de 20 €
    expect(r.custoCent).toBeCloseTo(2200);
    expect(r.precoCalcCent).toBe(2500);
    expect(r.precoFinalCent).toBe(2500);
    expect(r.ajustado).toBe(false);
    expect(r.diferencaCent).toBe(0);
    expect(r.abaixoDoCusto).toBe(false);
  });

  it('arredonda só no fim, não linha a linha', () => {
    // 3 linhas de 0,333 € → 0,999 €; com margem 0 e sem tempo/indiretos → 1 €
    const r = calcularBolo(
      {
        linhas: [1, 2, 3].map(() => ({ quantidade: 0.333, precoUnitCent: 100 })),
        tempoMin: 0,
        precoFinalCent: null,
      },
      { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 },
    );
    expect(r.materiaisCent).toBeCloseTo(99.9);
    expect(r.precoCalcCent).toBe(100);
  });

  it('bolo sem linhas nem tempo custa 0', () => {
    const r = calcularBolo({ linhas: [], tempoMin: 0, precoFinalCent: null }, params);
    expect(r.precoCalcCent).toBe(0);
    expect(r.custoCent).toBe(0);
  });

  it('usa o preço editado e calcula a diferença', () => {
    const r = calcularBolo(
      { linhas: [{ quantidade: 1, precoUnitCent: 1000 }], tempoMin: 60, precoFinalCent: 3000 },
      params,
    );
    expect(r.ajustado).toBe(true);
    expect(r.precoCalcCent).toBe(2500);
    expect(r.precoFinalCent).toBe(3000);
    expect(r.diferencaCent).toBe(500);
  });

  it('avisa quando o preço final fica abaixo do custo', () => {
    const r = calcularBolo(
      { linhas: [{ quantidade: 1, precoUnitCent: 1000 }], tempoMin: 60, precoFinalCent: 2000 },
      params,
    );
    expect(r.abaixoDoCusto).toBe(true); // custo 22 €
  });

  it('indica que o calculado mudou desde o ajuste', () => {
    const base = { linhas: [{ quantidade: 1, precoUnitCent: 1000 }], tempoMin: 60, precoFinalCent: 3000 };
    expect(calcularBolo({ ...base, precoCalcNoAjusteCent: 2500 }, params).calculadoMudou).toBe(false);
    expect(calcularBolo({ ...base, precoCalcNoAjusteCent: 2000 }, params).calculadoMudou).toBe(true);
    expect(
      calcularBolo({ ...base, precoFinalCent: null, precoCalcNoAjusteCent: 2000 }, params).calculadoMudou,
    ).toBe(false);
  });
});

describe('calcularOrcamento', () => {
  it('o total é a soma dos preços arredondados de cada bolo', () => {
    // dois bolos de 10,50 € → 11 € + 11 € = 22 € (e não round(21,00) = 21 €)
    const bolo = { linhas: [{ quantidade: 1, precoUnitCent: 1050 }], tempoMin: 0, precoFinalCent: null };
    const r = calcularOrcamento([bolo, bolo], { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 });
    expect(r.totalCalcCent).toBe(2200);
    expect(r.totalCent).toBe(2200);
    expect(r.diferencaCent).toBe(0);
  });

  it('o total usa os preços finais editados', () => {
    const p = { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 };
    const r = calcularOrcamento(
      [
        { linhas: [{ quantidade: 1, precoUnitCent: 1000 }], tempoMin: 0, precoFinalCent: 1500 },
        { linhas: [{ quantidade: 1, precoUnitCent: 2000 }], tempoMin: 0, precoFinalCent: null },
      ],
      p,
    );
    expect(r.totalCalcCent).toBe(3000);
    expect(r.totalCent).toBe(3500);
    expect(r.diferencaCent).toBe(500);
    expect(r.custoCent).toBeCloseTo(3000);
  });

  it('orçamento sem bolos tem total 0', () => {
    expect(calcularOrcamento([], params).totalCent).toBe(0);
  });
});
