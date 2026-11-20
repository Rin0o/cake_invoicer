import { calcularOrcamento } from '@/domain/pricing';
import { resumoTexto } from '@/share/texto';

const p = { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 };

function calculo(precos: (number | null)[], calc: number[]) {
  return calcularOrcamento(
    calc.map((c, i) => ({ linhas: [{ quantidade: 1, precoUnitCent: c }], tempoMin: 0, precoFinalCent: precos[i] })),
    p,
  );
}

describe('resumoTexto', () => {
  it('mostra negócio, entrega, bolos e total (sem o cliente)', () => {
    const texto = resumoTexto({
      nomeNegocio: 'Doces da Ana',
      referencia: '2027-QJQX',
      dataEntrega: '2027-03-05',
      bolos: [{ nome: 'Bolo de chocolate' }, { nome: 'Cupcakes' }],
      calculo: calculo([null, null], [4500, 2000]),
    });
    expect(texto).toBe(
      [
        '*Orçamento ref. 2027-QJQX — Doces da Ana*',
        '',
        'Entrega: 05/03/2027',
        '',
        '• Bolo de chocolate: 45 €',
        '• Cupcakes: 20 €',
        '',
        '*Total: 65 €*',
      ].join('\n'),
    );
  });

  it('usa os preços finais editados e não revela o calculado', () => {
    const texto = resumoTexto({
      nomeNegocio: '',
      referencia: '2027-VTJ9',
      dataEntrega: null,
      bolos: [{ nome: 'Bolo 1' }],
      calculo: calculo([5000], [4500]),
    });
    expect(texto).toContain('• Bolo 1: 50 €');
    expect(texto).toContain('*Total: 50 €*');
    expect(texto).not.toContain('45');
    expect(texto.startsWith('*Orçamento ref. 2027-VTJ9*\n\n• Bolo 1')).toBe(true);
  });
});
