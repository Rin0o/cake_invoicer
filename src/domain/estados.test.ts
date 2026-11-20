import {
  avisoMudancaDeGrupo,
  ESTADOS,
  ESTADOS_DO_GRUPO,
  GRUPOS,
  estadoDepoisDePartilhar, grupoDoEstado, passosSeguintes } from './estados';

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

  it('recusado: reabrir volta a rascunho', () => {
    expect(passosSeguintes('recusado')).toEqual([
      { estado: 'rascunho', rotulo: 'Reabrir', descricao: 'Reabrir para ajustar e reenviar', principal: true },
    ]);
  });

  it('rascunho e entregue não sugerem nada', () => {
    expect(passosSeguintes('rascunho')).toEqual([]);
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

describe('grupos', () => {
  it('cada estado pertence a exatamente um grupo', () => {
    for (const e of ESTADOS) {
      expect(GRUPOS.filter((g) => ESTADOS_DO_GRUPO[g].includes(e))).toEqual([grupoDoEstado(e)]);
    }
  });

  it('abertos, entregues e recusados', () => {
    expect(grupoDoEstado('rascunho')).toBe('abertos');
    expect(grupoDoEstado('enviado')).toBe('abertos');
    expect(grupoDoEstado('aceite')).toBe('abertos');
    expect(grupoDoEstado('entregue')).toBe('entregues');
    expect(grupoDoEstado('recusado')).toBe('recusados');
  });

  it('avisa só quando o orçamento muda de lista', () => {
    expect(avisoMudancaDeGrupo('enviado', 'aceite')).toBeNull();
    expect(avisoMudancaDeGrupo('aceite', 'entregue')).toBe('Passou para Entregues');
    expect(avisoMudancaDeGrupo('enviado', 'recusado')).toBe('Passou para Recusados');
    expect(avisoMudancaDeGrupo('recusado', 'rascunho')).toBe('Reaberto: está nos Abertos');
    expect(avisoMudancaDeGrupo('entregue', 'recusado')).toBe('Passou para Recusados');
  });
});

describe('estadoDepoisDePartilhar', () => {
  it('passa um rascunho a enviado e mantém os outros', () => {
    expect(estadoDepoisDePartilhar('rascunho')).toBe('enviado');
    expect(estadoDepoisDePartilhar('aceite')).toBe('aceite');
  });
});
