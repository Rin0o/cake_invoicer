import { estadoDepoisDePartilhar, ESTADOS, nomeEstado } from '@/domain/estados';
import { hojeIso } from '@/domain/format';
import { somaLinhas } from '@/domain/pricing';
import { escalaAplicaSe, escalarLinhas, escalaValida, type LinhaReceitaInput } from '@/domain/receitas';

const farinha: LinhaReceitaInput = { livre: false, tipo: 'ingrediente', quantidade: 0.5, precoUnitCent: 120 };
const caixa: LinhaReceitaInput = { livre: false, tipo: 'material', quantidade: 1, precoUnitCent: 150 };
const corante: LinhaReceitaInput = { livre: true, tipo: null, quantidade: 1, precoUnitCent: 100 };

describe('escala das receitas', () => {
  it('multiplica só os ingredientes', () => {
    const r = escalarLinhas([farinha, caixa, corante], 1.5);
    expect(r.map((l) => l.quantidade)).toEqual([0.75, 1, 1]);
    expect(somaLinhas(r)).toBeCloseTo(0.75 * 120 + 150 + 100);
  });

  it('mantém os outros campos e não altera o original', () => {
    const comExtra = [{ ...farinha, nome: 'Farinha' }];
    const r = escalarLinhas(comExtra, 2);
    expect(r[0]).toEqual({ ...farinha, nome: 'Farinha', quantidade: 1 });
    expect(comExtra[0].quantidade).toBe(0.5);
  });

  it('aceita escalas com casas decimais e menores que 1', () => {
    expect(escalarLinhas([farinha], 0.25)[0].quantidade).toBe(0.125);
  });

  it('recusa escala zero, negativa ou inválida', () => {
    expect(() => escalarLinhas([farinha], 0)).toThrow();
    expect(() => escalarLinhas([farinha], -1)).toThrow();
    expect(() => escalarLinhas([farinha], NaN)).toThrow();
  });

  it('valida a escala escrita', () => {
    expect(escalaValida(1)).toBe(true);
    expect(escalaValida(1.5)).toBe(true);
    expect(escalaValida(0)).toBe(false);
    expect(escalaValida(null)).toBe(false);
    expect(escalaValida(101)).toBe(false);
  });

  it('diz a que linhas a escala se aplica', () => {
    expect([farinha, caixa, corante].map(escalaAplicaSe)).toEqual([true, false, false]);
  });
});

describe('estados', () => {
  it('partilhar um rascunho passa-o a enviado; os outros mantêm-se', () => {
    expect(estadoDepoisDePartilhar('rascunho')).toBe('enviado');
    for (const e of ESTADOS.filter((x) => x !== 'rascunho')) {
      expect(estadoDepoisDePartilhar(e)).toBe(e);
    }
  });

  it('todos os estados têm nome', () => {
    expect(ESTADOS.map((e) => nomeEstado(e))).toEqual(['Rascunho', 'Enviado', 'Aceite', 'Recusado', 'Entregue']);
  });
});

describe('hojeIso', () => {
  it('usa a data local', () => {
    expect(hojeIso(new Date(2027, 2, 5, 23, 59))).toBe('2027-03-05');
    expect(hojeIso(new Date(2027, 11, 31, 0, 1))).toBe('2027-12-31');
  });
});
