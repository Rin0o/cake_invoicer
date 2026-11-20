import {
  centParaTexto,
  formatarData,
  formatarDataDeInstante,
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  formatarPrecoUnidade,
  formatarTempo,
  hojeIso,
  isoParaData,
  lerData,
  lerDecimal,
  lerEurosParaCent,
  lerTempo,
} from './format';
import { deUnidadeItem, paraUnidadeItem, unidadeEntradaPorOmissao } from './units';

describe('formatarDataDeInstante', () => {
  it('mostra o dia local do instante', () => {
    const instante = new Date(2026, 10, 12, 23, 45).toISOString(); // 23:45 locais
    expect(formatarDataDeInstante(instante)).toBe('12/11/2026');
  });

  it('vazio ou inválido não mostra nada', () => {
    expect(formatarDataDeInstante('')).toBe('');
    expect(formatarDataDeInstante(null)).toBe('');
    expect(formatarDataDeInstante('ontem')).toBe('');
  });
});

describe('isoParaData', () => {
  it('converte para meia-noite local e volta ao mesmo ISO', () => {
    const d = isoParaData('2027-03-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 2, 5, 0]);
    expect(hojeIso(d)).toBe('2027-03-05');
  });

  it('sem data, devolve hoje', () => {
    const agora = new Date(2026, 10, 19, 15, 30);
    expect(isoParaData(null, agora)).toEqual(new Date(2026, 10, 19));
    expect(isoParaData('', agora)).toEqual(new Date(2026, 10, 19));
  });
});

describe('lerDecimal', () => {
  it('aceita vírgula ou ponto', () => {
    expect(lerDecimal('1,5')).toBe(1.5);
    expect(lerDecimal('1.5')).toBe(1.5);
    expect(lerDecimal(' 250 ')).toBe(250);
    expect(lerDecimal(',5')).toBe(0.5);
  });

  it('rejeita texto inválido', () => {
    expect(lerDecimal('')).toBeNull();
    expect(lerDecimal('abc')).toBeNull();
    expect(lerDecimal('1,2,3')).toBeNull();
    expect(lerDecimal(',')).toBeNull();
  });
});

describe('euros', () => {
  it('lê euros para cêntimos', () => {
    expect(lerEurosParaCent('1,20')).toBe(120);
    expect(lerEurosParaCent('0.1')).toBe(10);
    expect(lerEurosParaCent('x')).toBeNull();
  });

  it('formata cêntimos', () => {
    expect(formatarEuro(36)).toBe('0,36 €');
    expect(formatarEuro(123456)).toBe('1 234,56 €');
    expect(formatarEuro(35.6)).toBe('0,36 €');
    expect(formatarEuro(-500)).toBe('−5,00 €');
    expect(formatarEuroInteiro(4500)).toBe('45 €');
    expect(centParaTexto(120)).toBe('1,20');
    expect(formatarPrecoUnidade(120, 'kg')).toBe('1,20 €/kg');
  });

  it('formata decimais sem zeros a mais', () => {
    expect(formatarDecimal(0.25)).toBe('0,25');
    expect(formatarDecimal(300)).toBe('300');
  });
});

describe('tempo', () => {
  it('lê vários formatos', () => {
    expect(lerTempo('150')).toBe(150);
    expect(lerTempo('45 min')).toBe(45);
    expect(lerTempo('2h')).toBe(120);
    expect(lerTempo('2h30')).toBe(150);
    expect(lerTempo('2:30')).toBe(150);
    expect(lerTempo('1,5h')).toBe(90);
    expect(lerTempo('')).toBeNull();
    expect(lerTempo('2h75')).toBeNull();
    expect(lerTempo('abc')).toBeNull();
  });

  it('formata', () => {
    expect(formatarTempo(45)).toBe('45 min');
    expect(formatarTempo(120)).toBe('2h');
    expect(formatarTempo(150)).toBe('2h30');
    expect(formatarTempo(65)).toBe('1h05');
  });
});

describe('datas', () => {
  it('lê dd/mm/aaaa', () => {
    expect(lerData('5/3/2027')).toBe('2027-03-05');
    expect(lerData('05/03/27')).toBe('2027-03-05');
    expect(lerData('31/02/2027')).toBeNull();
    expect(lerData('amanhã')).toBeNull();
    expect(formatarData('2027-03-05')).toBe('05/03/2027');
    expect(formatarData(null)).toBe('');
  });
});

describe('unidades', () => {
  it('converte g/ml para kg/l e volta', () => {
    expect(paraUnidadeItem(250, 'g', 'kg')).toBeCloseTo(0.25);
    expect(paraUnidadeItem(2, 'kg', 'kg')).toBe(2);
    expect(deUnidadeItem(0.25, 'g', 'kg')).toBeCloseTo(250);
    expect(paraUnidadeItem(3, 'un', 'un')).toBe(3);
  });

  it('sugere g e ml por omissão', () => {
    expect(unidadeEntradaPorOmissao('kg')).toBe('g');
    expect(unidadeEntradaPorOmissao('l')).toBe('ml');
    expect(unidadeEntradaPorOmissao('un')).toBe('un');
  });

  it('rejeita unidades incompatíveis', () => {
    expect(() => paraUnidadeItem(1, 'ml', 'kg')).toThrow();
  });
});
