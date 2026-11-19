import { ESTADOS, estadoDepoisDePartilhar, passosSeguintes } from './estados';

describe('passosSeguintes', () => {
  it('enviado: aceitar (principal) ou recusar', () => {
    expect(passosSeguintes('enviado')).toEqual([
      { estado: 'aceite', rotulo: 'Aceitou', descricao: 'Cliente aceitou', principal: true },
      { estado: 'recusado', rotulo: 'Recusou', descricao: 'Cliente recusou', principal: false },
    ]);
  });

  it('aceite: marcar como entregue', () => {
    expect(passosSeguintes('aceite').map((p) => p.estado)).toEqual(['entregue']);
  });

  it('rascunho, recusado e entregue não sugerem nada', () => {
    expect(passosSeguintes('rascunho')).toEqual([]);
    expect(passosSeguintes('recusado')).toEqual([]);
    expect(passosSeguintes('entregue')).toEqual([]);
  });

  it('nunca sugere o próprio estado e tem no máximo um passo principal', () => {
    for (const e of ESTADOS) {
      const passos = passosSeguintes(e);
      expect(passos.some((p) => p.estado === e)).toBe(false);
      expect(passos.filter((p) => p.principal).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('estadoDepoisDePartilhar', () => {
  it('passa um rascunho a enviado e mantém os outros', () => {
    expect(estadoDepoisDePartilhar('rascunho')).toBe('enviado');
    expect(estadoDepoisDePartilhar('aceite')).toBe('aceite');
  });
});
