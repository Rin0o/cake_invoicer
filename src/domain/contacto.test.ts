import { opcoesContacto, rotuloEtiqueta } from './contacto';

describe('rotuloEtiqueta', () => {
  it('traduz as etiquetas do Android', () => {
    expect(rotuloEtiqueta('mobile')).toBe('Telemóvel');
    expect(rotuloEtiqueta('faxWork')).toBe('Fax (trabalho)');
    expect(rotuloEtiqueta('home')).toBe('Casa');
  });

  it('mantém etiquetas personalizadas e ignora vazias', () => {
    expect(rotuloEtiqueta('Loja')).toBe('Loja');
    expect(rotuloEtiqueta('  ')).toBeNull();
    expect(rotuloEtiqueta(undefined)).toBeNull();
  });
});

describe('opcoesContacto', () => {
  it('telefones primeiro, depois emails', () => {
    expect(
      opcoesContacto(
        [{ number: '912 345 678', label: 'mobile' }],
        [{ address: 'ana@exemplo.pt', label: 'work' }, { address: 'ana2@exemplo.pt' }],
      ),
    ).toEqual([
      { tipo: 'telefone', valor: '912 345 678', rotulo: 'Telemóvel' },
      { tipo: 'email', valor: 'ana@exemplo.pt', rotulo: 'Email · Trabalho' },
      { tipo: 'email', valor: 'ana2@exemplo.pt', rotulo: 'Email' },
    ]);
  });

  it('ignora vazios e repetidos (mesmo número escrito de outra forma)', () => {
    expect(
      opcoesContacto(
        [{ number: '912 345 678' }, { number: '912345678', label: 'home' }, { number: ' ' }, {}],
        [{ address: 'Ana@Exemplo.pt' }, { address: 'ana@exemplo.pt' }],
      ),
    ).toEqual([
      { tipo: 'telefone', valor: '912 345 678', rotulo: 'Telefone' },
      { tipo: 'email', valor: 'Ana@Exemplo.pt', rotulo: 'Email' },
    ]);
  });

  it('sem telefones nem emails, não há opções', () => {
    expect(opcoesContacto([], [])).toEqual([]);
  });
});
