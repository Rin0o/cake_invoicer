import { avisoMudancaDeGrupo, nomeEstado, passosSeguintes } from '@/domain/estados';
import { opcoesContacto } from '@/domain/contacto';
import {
  centParaTexto,
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  formatarPercentagem,
  formatarPrecoUnidade,
  lerEurosParaCent,
} from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';
import {
  definirIdioma,
  ehIdioma,
  ehNomePorOmissaoBolo,
  idiomaAtual,
  IDIOMAS,
  resolverIdioma,
  subscreverIdioma,
  textos,
  textosDe,
} from '@/i18n';
import { htmlOrcamento, nomeFicheiroPdf } from '@/pdf/template';
import { resumoTexto } from '@/share/texto';

afterEach(() => definirIdioma('pt'));

/** Percorre o dicionário: devolve [caminho, valor] de cada texto (as funções são chamadas). */
function folhas(obj: unknown, caminho = ''): [string, unknown][] {
  if (typeof obj === 'function') {
    const args = Array.from({ length: obj.length }, (_, i) => (i === 0 ? 2 : 'X'));
    return [[caminho, obj(...args)]];
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => folhas(v, caminho ? `${caminho}.${k}` : k));
  }
  return [[caminho, obj]];
}

describe('dicionários', () => {
  const referencia = folhas(textosDe('pt')).map(([c]) => c);

  it.each(IDIOMAS)('%s tem as mesmas chaves que o português', (i) => {
    // O TypeScript verifica as chaves fixas; isto cobre também as etiquetas e as cores (Record).
    expect(folhas(textosDe(i)).map(([c]) => c)).toEqual(referencia);
  });

  it.each(IDIOMAS)('%s não tem textos vazios', (i) => {
    for (const [caminho, valor] of folhas(textosDe(i))) {
      // O separador de milhares pode ser um espaço.
      const vazio = caminho === 'formato.milhares' ? valor === '' : String(valor).trim() === '';
      expect([caminho, typeof valor === 'string' && !vazio]).toEqual([caminho, true]);
    }
  });

  it('os nomes por omissão dos bolos são diferentes em cada idioma', () => {
    const prefixos = IDIOMAS.map((i) => textosDe(i).bolo.prefixoNome);
    expect(new Set(prefixos).size).toBe(IDIOMAS.length);
  });

  it('o nome do ficheiro PDF só tem letras sem acentos', () => {
    for (const i of IDIOMAS) expect(textosDe(i).pdf.nomeFicheiro).toMatch(/^[A-Za-z]+$/);
  });
});

describe('escolha do idioma', () => {
  it('a preferência guardada ganha ao telemóvel', () => {
    expect(resolverIdioma('fr', 'pt-PT')).toBe('fr');
  });

  it('automático usa a língua do telemóvel, se a app a tiver', () => {
    expect(resolverIdioma('', 'es')).toBe('es');
    expect(resolverIdioma('', 'EN-gb')).toBe('en');
    expect(resolverIdioma('', 'pt')).toBe('pt');
  });

  it('noutra língua, ou sem saber qual, usa o inglês', () => {
    expect(resolverIdioma('', 'de')).toBe('en');
    expect(resolverIdioma('', null)).toBe('en');
    expect(resolverIdioma('xx', undefined)).toBe('en');
  });

  it('reconhece os idiomas da app', () => {
    expect(IDIOMAS.every(ehIdioma)).toBe(true);
    expect(ehIdioma('de')).toBe(false);
    expect(ehIdioma('')).toBe(false);
  });

  it('avisa quem está a ouvir só quando o idioma muda', () => {
    const ouvinte = jest.fn();
    const parar = subscreverIdioma(ouvinte);
    definirIdioma('pt');
    expect(ouvinte).not.toHaveBeenCalled();
    definirIdioma('en');
    expect(idiomaAtual()).toBe('en');
    expect(textos().comum.orcamento).toBe('Quote');
    expect(ouvinte).toHaveBeenCalledTimes(1);
    parar();
    definirIdioma('es');
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('reconhece o nome por omissão de um bolo em qualquer idioma', () => {
    for (const nome of ['Bolo 1', 'Cake 2', 'Pastel 10', 'Gâteau 3']) expect(ehNomePorOmissaoBolo(nome)).toBe(true);
    for (const nome of ['Bolo', 'Bolo de anos 2', 'Cake', '2', 'Torta 1']) expect(ehNomePorOmissaoBolo(nome)).toBe(false);
  });
});

describe('formatação por idioma', () => {
  it('português, espanhol e francês: vírgula decimal e € no fim', () => {
    for (const i of ['pt', 'es', 'fr'] as const) {
      definirIdioma(i);
      expect(formatarEuro(123456)).toBe('1 234,56 €');
      expect(formatarEuroInteiro(-4500)).toBe('−45 €');
      expect(centParaTexto(120)).toBe('1,20');
      expect(formatarDecimal(1.5)).toBe('1,5');
      expect(formatarPercentagem(30)).toBe('30 %');
    }
  });

  it('inglês: ponto decimal, vírgula nos milhares e € à frente', () => {
    definirIdioma('en');
    expect(formatarEuro(123456)).toBe('€1,234.56');
    expect(formatarEuro(-500)).toBe('−€5.00');
    expect(formatarEuroInteiro(4500)).toBe('€45');
    expect(centParaTexto(120)).toBe('1.20');
    expect(formatarDecimal(0.25)).toBe('0.25');
    expect(formatarPercentagem(12.5)).toBe('12.5%');
  });

  it('o símbolo da unidade segue o idioma; a leitura aceita vírgula ou ponto', () => {
    definirIdioma('en');
    expect(formatarPrecoUnidade(25, 'un')).toBe('€0.25/pc');
    expect(formatarPrecoUnidade(120, 'kg')).toBe('€1.20/kg');
    expect(lerEurosParaCent('1,20')).toBe(120);
    expect(lerEurosParaCent('1.20')).toBe(120);
    definirIdioma('es');
    expect(formatarPrecoUnidade(25, 'un')).toBe('0,25 €/ud');
  });
});

describe('domínio noutro idioma', () => {
  it('estados, passos e avisos', () => {
    definirIdioma('en');
    expect(nomeEstado('aceite')).toBe('Accepted');
    expect(passosSeguintes('enviado').map((p) => p.rotulo)).toEqual(['Accepted', 'Declined']);
    expect(avisoMudancaDeGrupo('aceite', 'entregue')).toBe('Moved to Delivered');
    definirIdioma('fr');
    expect(avisoMudancaDeGrupo('recusado', 'rascunho')).toBe('Rouvert : il est dans En cours');
  });

  it('etiquetas dos contactos', () => {
    definirIdioma('es');
    expect(opcoesContacto([{ number: '600 000 000', label: 'mobile' }], [{ address: 'a@b.es' }])).toEqual([
      { tipo: 'telefone', valor: '600 000 000', rotulo: 'Móvil' },
      { tipo: 'email', valor: 'a@b.es', rotulo: 'Email' },
    ]);
  });
});

describe('PDF e texto para o cliente noutro idioma', () => {
  const calculo = {
    bolos: [{ precoFinalCent: 4500 }],
    totalCent: 4500,
  } as unknown as OrcamentoCalculado;

  it('o PDF sai todo no idioma da app', () => {
    definirIdioma('en');
    const html = htmlOrcamento({
      nomeNegocio: 'Doces',
      cor: 'marinho',
      contactos: { telefone: '', email: '', instagram: '', facebook: '', tiktok: '', site: '' },
      referencia: '2026-QJQX',
      dataEntrega: '2026-12-24',
      dataEmissao: '2026-11-20',
      bolos: [{ nome: 'Bolo de anos' }],
      calculo,
    });
    expect(html).toContain('<html lang="en-GB">');
    expect(html).toContain('<h1>Quote</h1>');
    expect(html).toContain('>Delivery</span> 24/12/2026');
    expect(html).toContain('<th>Cake</th><th class="valor">Price</th>');
    expect(html).toContain('<td>Total</td><td class="valor">€45</td>');
    expect(html).toContain('Quote — this is not an invoice.');
    expect(html).not.toMatch(/Orçamento|Entrega|Preço/);
    // o nome do bolo é do utilizador: fica como foi escrito
    expect(html).toContain('Bolo de anos');
  });

  it('o nome do ficheiro começa pela palavra do idioma', () => {
    definirIdioma('fr');
    expect(nomeFicheiroPdf('2026-QJQX', 'Ana')).toBe('Devis-2026-QJQX-Ana.pdf');
  });

  it('o resumo em texto sai no idioma da app', () => {
    definirIdioma('es');
    const texto = resumoTexto({
      nomeNegocio: '',
      referencia: '2026-QJQX',
      dataEntrega: '2026-12-24',
      bolos: [{ nome: 'Tarta' }],
      calculo,
    });
    expect(texto).toBe('*Presupuesto ref. 2026-QJQX*\n\nEntrega: 24/12/2026\n\n• Tarta: 45 €\n\n*Total: 45 €*');
  });
});
