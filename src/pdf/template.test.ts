import { calcularOrcamento } from '@/domain/pricing';
import { escaparHtml, htmlOrcamento, linhasContactos, nomeFicheiroPdf, type ContactosNegocio, type DadosPdf } from '@/pdf/template';

const p = { valorHoraCent: 0, indiretoPct: 0, margemPct: 0 };
const SEM_CONTACTOS: ContactosNegocio = { telefone: '', email: '', instagram: '', facebook: '', tiktok: '', site: '' };

function dados(extra: Partial<DadosPdf> = {}): DadosPdf {
  const calculo = calcularOrcamento(
    [
      { linhas: [{ quantidade: 1, precoUnitCent: 4500 }], tempoMin: 0, precoFinalCent: null },
      { linhas: [{ quantidade: 1, precoUnitCent: 2000 }], tempoMin: 0, precoFinalCent: 2500 },
    ],
    p,
  );
  return {
    nomeNegocio: 'Doces da Avó',
    cor: 'lilas',
    contactos: { ...SEM_CONTACTOS, telefone: '912 345 678', instagram: '@docesdaavo' },
    numero: '2027-014',
    dataEntrega: '2027-03-05',
    dataEmissao: '2027-02-20',
    bolos: [{ nome: 'Bolo de chocolate' }, { nome: 'Cupcakes' }],
    calculo,
    ...extra,
  };
}

describe('htmlOrcamento', () => {
  it('mostra o nome do negócio, datas, bolos com preço final, total e contactos, sem o cliente', () => {
    const html = htmlOrcamento(dados());
    expect(html).toContain('<div class="marca">Doces da Avó</div>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('Cliente');
    expect(html).toContain('<span class="contacto">912 345 678</span> &nbsp;·&nbsp; <span class="contacto">Instagram @docesdaavo</span>');
    expect(html).toMatch(/Número<\/span> 2027-014/);
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
    const html = htmlOrcamento(dados({ nomeNegocio: '  ', contactos: SEM_CONTACTOS, dataEntrega: null }));
    expect(html).not.toContain('<header>');
    expect(html).not.toContain('class="contactos"');
    expect(html).not.toContain('Entrega');
    expect(html).toContain('<h1>Orçamento</h1>');
    expect(html).toContain('não serve de fatura');
  });

  it('usa as quatro cores da opção escolhida', () => {
    const html = htmlOrcamento(dados({ cor: 'salva' }));
    for (const hex of ['#4A6E50', '#1D251F', '#5C665E', '#E5EBE6']) expect(html).toContain(hex);
    expect(html).not.toContain('#A63D6B');
  });

  it('uma cor desconhecida usa a cor por omissão', () => {
    expect(htmlOrcamento(dados({ cor: 'nao-existe' }))).toContain('#24406E');
  });

  it('escapa texto escrito por quem usa a app', () => {
    const html = htmlOrcamento(
      dados({
        nomeNegocio: 'Bolos <b>&</b>',
        contactos: { ...SEM_CONTACTOS, site: '<i>x</i>' },
        bolos: [{ nome: '<script>x</script>' }, { nome: 'A & B "1"' }],
      }),
    );
    expect(html).toContain('Bolos &lt;b&gt;&amp;&lt;/b&gt;');
    expect(html).toContain('&lt;i&gt;x&lt;/i&gt;');
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
  it('número e cliente, sem acentos nem espaços', () => {
    expect(nomeFicheiroPdf('2027-014', 'Ana Conceição')).toBe('Orcamento-2027-014-Ana-Conceicao.pdf');
    expect(nomeFicheiroPdf('2027-014', '  / Rui! ')).toBe('Orcamento-2027-014-Rui.pdf');
  });

  it('sem cliente', () => {
    expect(nomeFicheiroPdf('2027-014', '')).toBe('Orcamento-2027-014.pdf');
  });
});

describe('linhasContactos', () => {
  it('fica vazio sem contactos', () => {
    expect(linhasContactos(SEM_CONTACTOS)).toEqual([]);
  });

  it('mostra todos pela ordem do rodapé, com o nome da rede social', () => {
    expect(
      linhasContactos({
        telefone: ' 912 345 678 ',
        email: 'ola@doces.pt',
        instagram: 'docesdaavo',
        facebook: 'Doces da Avó',
        tiktok: '@docesdaavo',
        site: 'https://www.doces.pt/',
      }),
    ).toEqual([
      '912 345 678',
      'ola@doces.pt',
      'Instagram @docesdaavo',
      'Facebook Doces da Avó',
      'TikTok @docesdaavo',
      'www.doces.pt',
    ]);
  });

  it('aceita o link do perfil em vez do nome', () => {
    expect(
      linhasContactos({
        ...SEM_CONTACTOS,
        instagram: 'https://www.instagram.com/docesdaavo/?hl=pt',
        facebook: 'facebook.com/docesdaavo',
        tiktok: 'https://www.tiktok.com/@docesdaavo',
      }),
    ).toEqual(['Instagram @docesdaavo', 'Facebook docesdaavo', 'TikTok @docesdaavo']);
  });

  it('ignora um "@" sozinho', () => {
    expect(linhasContactos({ ...SEM_CONTACTOS, instagram: ' @ ' })).toEqual([]);
  });
});
