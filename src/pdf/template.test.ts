import { calcularOrcamento } from '@/domain/pricing';
import { escaparHtml, htmlOrcamento, nomeFicheiroPdf, type DadosPdf } from '@/pdf/template';

const p = { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 };

function dados(extra: Partial<DadosPdf> = {}): DadosPdf {
  const calculo = calcularOrcamento(
    [
      { linhas: [{ quantidade: 1, precoUnitCent: 4500 }], tempoMin: 0, precoFinalCent: null },
      { linhas: [{ quantidade: 1, precoUnitCent: 2000 }], tempoMin: 0, precoFinalCent: 2500 },
    ],
    p,
  );
  return {
    logotipo: 'data:image/png;base64,AAAA',
    dataEntrega: '2027-03-05',
    dataEmissao: '2027-02-20',
    bolos: [{ nome: 'Bolo de chocolate' }, { nome: 'Cupcakes' }],
    calculo,
    ...extra,
  };
}

describe('htmlOrcamento', () => {
  it('mostra logótipo, datas, bolos com preço final e total, sem o cliente', () => {
    const html = htmlOrcamento(dados());
    expect(html).toContain('<img src="data:image/png;base64,AAAA"');
    expect(html).not.toContain('Cliente');
    expect(html).toContain('05/03/2027');
    expect(html).toContain('20/02/2027');
    expect(html).toMatch(/Bolo de chocolate<\/td><td class="valor">45 €/);
    expect(html).toMatch(/Cupcakes<\/td><td class="valor">25 €/);
    expect(html).toMatch(/Total<\/td><td class="valor">70 €/);
    expect(html).toContain('não serve de fatura');
  });

  it('não revela o preço calculado de um bolo ajustado', () => {
    expect(htmlOrcamento(dados())).not.toContain('20 €');
  });

  it('omite o que não existe', () => {
    const html = htmlOrcamento(dados({ logotipo: null, dataEntrega: null }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<header>');
    expect(html).not.toContain('Entrega');
  });

  it('escapa texto escrito por quem usa a app', () => {
    const html = htmlOrcamento(dados({ bolos: [{ nome: '<script>x</script>' }, { nome: 'A & B "1"' }] }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &quot;1&quot;');
  });
});

describe('escaparHtml', () => {
  it("escapa & < > \" '", () => {
    expect(escaparHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

describe('nomeFicheiroPdf', () => {
  it('sem acentos nem espaços', () => {
    expect(nomeFicheiroPdf('Ana Conceição', '2027-03-05')).toBe('Orcamento-Ana-Conceicao-2027-03-05.pdf');
    expect(nomeFicheiroPdf('  / Rui! ', '2027-03-05')).toBe('Orcamento-Rui-2027-03-05.pdf');
  });

  it('sem cliente', () => {
    expect(nomeFicheiroPdf('', '2027-03-05')).toBe('Orcamento-2027-03-05.pdf');
  });
});
