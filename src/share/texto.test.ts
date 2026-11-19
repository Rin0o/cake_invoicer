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
  it('mostra negócio, cliente, entrega, bolos, total e contacto', () => {
    const texto = resumoTexto({
      nomeNegocio: 'Doces da Ana',
      contactoNegocio: '912 345 678',
      cliente: 'Rui',
      dataEntrega: '2027-03-05',
      bolos: [{ nome: 'Bolo de chocolate' }, { nome: 'Cupcakes' }],
      calculo: calculo([null, null], [4500, 2000]),
    });
    expect(texto).toBe(
      [
        '*Orçamento — Doces da Ana*',
        '',
        'Cliente: Rui',
        'Entrega: 05/03/2027',
        '',
        '• Bolo de chocolate: 45 €',
        '• Cupcakes: 20 €',
        '',
        '*Total: 65 €*',
        '',
        '912 345 678',
        '',
        '_Orçamento — não serve de fatura._',
      ].join('\n'),
    );
  });

  it('usa os preços finais editados e não revela o calculado', () => {
    const texto = resumoTexto({
      nomeNegocio: '',
      contactoNegocio: '',
      cliente: '',
      dataEntrega: null,
      bolos: [{ nome: 'Bolo 1' }],
      calculo: calculo([5000], [4500]),
    });
    expect(texto).toContain('• Bolo 1: 50 €');
    expect(texto).toContain('*Total: 50 €*');
    expect(texto).not.toContain('45');
    expect(texto.startsWith('*Orçamento*\n\n• Bolo 1')).toBe(true);
  });
});
