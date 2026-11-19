import { gerarBackup, restaurarBackup, TABELAS, validarBackup } from '@/backup/backup';
import { migrar, VERSAO_SCHEMA } from '@/db/migrations';
import * as repo from '@/db/repo';
import { abrirBaseDeTeste } from '@/db/testDb';
import { paraUnidadeItem } from '@/domain/units';

jest.mock('expo-file-system', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({}));

async function novaBase() {
  const db = abrirBaseDeTeste();
  await migrar(db);
  return db;
}

async function itemFarinha(db: Awaited<ReturnType<typeof novaBase>>) {
  const id = await repo.criarItem(db, {
    tipo: 'ingrediente', nome: 'Farinha', unidade: 'kg', preco_unidade_cent: 120, ativo: 1,
  });
  return (await repo.obterItem(db, id))!;
}

describe('migrations', () => {
  it('cria o schema e as definições por omissão', async () => {
    const db = await novaBase();
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(VERSAO_SCHEMA);
    const d = await repo.obterDefinicoes(db);
    expect(d.valor_hora_cent).toBe(1000);
    expect(d.margem_pct).toBe(30);
  });

  it('não volta a migrar uma base já atualizada', async () => {
    const db = await novaBase();
    await expect(migrar(db)).resolves.toBeUndefined();
  });

  it('recusa abrir uma base de uma versão mais recente da app', async () => {
    const db = await novaBase();
    await db.execAsync(`PRAGMA user_version = ${VERSAO_SCHEMA + 1}`);
    await expect(migrar(db)).rejects.toThrow('versão mais recente');
  });

  it('todas as tabelas do backup existem com as colunas declaradas', async () => {
    const db = await novaBase();
    for (const [tabela, colunas] of Object.entries(TABELAS)) {
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tabela})`);
      expect(info.map((c) => c.name).sort()).toEqual([...colunas].sort());
    }
  });
});

describe('orçamentos', () => {
  it('fluxo completo: linhas, tempo, preço editado e repor', async () => {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const oid = await repo.criarOrcamento(db);

    let o = (await repo.obterOrcamento(db, oid))!;
    expect(o.bolos).toHaveLength(1);
    expect(o.margem_pct).toBe(30);
    const boloId = o.bolos[0].id;

    // 1 kg de farinha = 1,20 €; 60 min a 10 €/h = 10 €
    await repo.adicionarLinhaItem(db, boloId, farinha, paraUnidadeItem(1000, 'g', 'kg'), 'g');
    await repo.adicionarLinhaLivre(db, boloId, 'Impressão', 880);
    await repo.atualizarBolo(db, boloId, { tempo_min: 60 });

    o = (await repo.obterOrcamento(db, oid))!;
    let c = repo.calcular(o);
    // materiais 10,00; tempo 10,00; indiretos 2,00; margem 3,00 → 25 €
    expect(c.bolos[0].precoCalcCent).toBe(2500);
    expect(o.total_cent).toBe(2500);

    await repo.definirPrecoFinal(db, boloId, 3000, c.bolos[0].precoCalcCent);
    o = (await repo.obterOrcamento(db, oid))!;
    c = repo.calcular(o);
    expect(c.totalCent).toBe(3000);
    expect(o.total_cent).toBe(3000);
    expect(o.total_calc_cent).toBe(2500);
    expect(c.bolos[0].calculadoMudou).toBe(false);

    // mudar a margem altera o calculado, mas não o preço editado
    await repo.atualizarOrcamento(db, oid, { margem_pct: 50 });
    o = (await repo.obterOrcamento(db, oid))!;
    c = repo.calcular(o);
    expect(c.bolos[0].precoCalcCent).toBe(2700);
    expect(c.bolos[0].precoFinalCent).toBe(3000);
    expect(c.bolos[0].calculadoMudou).toBe(true);

    // repor
    await repo.definirPrecoFinal(db, boloId, null, c.bolos[0].precoCalcCent);
    o = (await repo.obterOrcamento(db, oid))!;
    c = repo.calcular(o);
    expect(c.bolos[0].ajustado).toBe(false);
    expect(o.total_cent).toBe(2700);
  });

  it('mudar o preço no catálogo não altera orçamentos existentes', async () => {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const oid = await repo.criarOrcamento(db);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;
    await repo.adicionarLinhaItem(db, boloId, farinha, 1, 'kg');

    await repo.atualizarItem(db, farinha.id, { ...farinha, preco_unidade_cent: 999 });
    const o = (await repo.obterOrcamento(db, oid))!;
    expect(o.bolos[0].linhas[0].preco_unit_cent).toBe(120);
  });

  it('mudar as definições não altera orçamentos existentes', async () => {
    const db = await novaBase();
    const oid = await repo.criarOrcamento(db);
    await repo.guardarDefinicoes(db, {
      valor_hora_cent: 2000, custo_indireto_pct: 5, margem_pct: 10, nome_negocio: '', contacto: '',
    });
    const o = (await repo.obterOrcamento(db, oid))!;
    expect(o.valor_hora_cent).toBe(1000);
    expect(o.margem_pct).toBe(30);
  });

  it('vários bolos, apagar bolo e apagar orçamento em cascata', async () => {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const oid = await repo.criarOrcamento(db);
    await repo.adicionarBolo(db, oid);
    let o = (await repo.obterOrcamento(db, oid))!;
    expect(o.bolos.map((b) => b.nome)).toEqual(['Bolo 1', 'Bolo 2']);
    await repo.adicionarLinhaItem(db, o.bolos[1].id, farinha, 1, 'kg');

    await repo.apagarBolo(db, o.bolos[0].id);
    o = (await repo.obterOrcamento(db, oid))!;
    expect(o.bolos).toHaveLength(1);

    await repo.apagarOrcamento(db, oid);
    const linhas = await db.getAllAsync('SELECT * FROM orcamento_linhas');
    expect(linhas).toHaveLength(0);
  });

  it('pesquisa por cliente', async () => {
    const db = await novaBase();
    const a = await repo.criarOrcamento(db);
    const b = await repo.criarOrcamento(db);
    await repo.atualizarOrcamento(db, a, { cliente: 'Ana Silva' });
    await repo.atualizarOrcamento(db, b, { cliente: 'Rui 100%' });
    expect((await repo.listarOrcamentos(db, 'ana')).map((o) => o.id)).toEqual([a]);
    expect((await repo.listarOrcamentos(db, '%')).map((o) => o.id)).toEqual([b]);
    expect(await repo.listarOrcamentos(db, '')).toHaveLength(2);
  });

  it('editar e remover linhas recalcula o total guardado', async () => {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const oid = await repo.criarOrcamento(db);
    await repo.atualizarOrcamento(db, oid, { margem_pct: 0 });
    await db.execAsync(`UPDATE orcamentos SET indireto_pct = 0 WHERE id = ${oid}`);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;

    await repo.adicionarLinhaItem(db, boloId, farinha, 10, 'kg'); // 12 €
    await repo.adicionarLinhaLivre(db, boloId, 'Topper', 300); // 3 €
    let o = (await repo.obterOrcamento(db, oid))!;
    expect(o.total_cent).toBe(1500);
    const [linhaFarinha, linhaTopper] = o.bolos[0].linhas;

    await repo.atualizarLinha(db, linhaFarinha.id, { quantidade: 5, unidade_entrada: 'kg' }); // 6 €
    await repo.atualizarLinha(db, linhaTopper.id, { descricao: 'Topper dourado', preco_unit_cent: 400 });
    o = (await repo.obterOrcamento(db, oid))!;
    expect(o.total_cent).toBe(1000);
    expect(o.bolos[0].linhas[1].descricao).toBe('Topper dourado');
    // o preço copiado do catálogo não muda ao editar a quantidade
    expect(o.bolos[0].linhas[0].preco_unit_cent).toBe(120);

    await repo.apagarLinha(db, linhaTopper.id);
    o = (await repo.obterOrcamento(db, oid))!;
    expect(o.bolos[0].linhas).toHaveLength(1);
    expect(o.total_cent).toBe(600);
  });

  it('filtra itens por tipo e por ativos', async () => {
    const db = await novaBase();
    await itemFarinha(db);
    await repo.criarItem(db, { tipo: 'material', nome: 'Caixa', unidade: 'un', preco_unidade_cent: 150, ativo: 1 });
    await repo.criarItem(db, { tipo: 'material', nome: 'Base antiga', unidade: 'un', preco_unidade_cent: 50, ativo: 0 });
    expect((await repo.listarItens(db, { tipo: 'material' })).map((i) => i.nome)).toEqual(['Caixa', 'Base antiga']);
    expect((await repo.listarItens(db, { soAtivos: true })).map((i) => i.nome)).toEqual(['Caixa', 'Farinha']);
  });

  it('apagar item usado mantém a linha do orçamento', async () => {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const oid = await repo.criarOrcamento(db);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;
    await repo.adicionarLinhaItem(db, boloId, farinha, 1, 'kg');
    expect(await repo.itemEmUso(db, farinha.id)).toBe(true);
    await repo.apagarItem(db, farinha.id);
    const l = (await repo.obterOrcamento(db, oid))!.bolos[0].linhas[0];
    expect(l.item_id).toBeNull();
    expect(l.descricao).toBe('Farinha');
  });
});

describe('backup', () => {
  it('exporta e restaura todos os dados', async () => {
    const origem = await novaBase();
    const farinha = await itemFarinha(origem);
    const oid = await repo.criarOrcamento(origem);
    const boloId = (await repo.obterOrcamento(origem, oid))!.bolos[0].id;
    await repo.adicionarLinhaItem(origem, boloId, farinha, 0.5, 'g');
    await repo.atualizarOrcamento(origem, oid, { cliente: 'Ana' });

    const json = JSON.parse(JSON.stringify(await gerarBackup(origem)));
    const backup = validarBackup(json, VERSAO_SCHEMA);

    const destino = await novaBase();
    await repo.criarItem(destino, { tipo: 'material', nome: 'Apagar-me', unidade: 'un', preco_unidade_cent: 1, ativo: 1 });
    await restaurarBackup(destino, backup);

    expect((await repo.listarItens(destino)).map((i) => i.nome)).toEqual(['Farinha']);
    const o = (await repo.obterOrcamento(destino, oid))!;
    expect(o.cliente).toBe('Ana');
    expect(o.bolos[0].linhas[0].quantidade).toBe(0.5);
  });

  it('recusa ficheiros que não são backups ou de outra versão', () => {
    expect(() => validarBackup({ foo: 1 }, VERSAO_SCHEMA)).toThrow('não é um backup');
    expect(() =>
      validarBackup({ app: 'orcamentos-bolos', versao_schema: 99, tabelas: {} }, VERSAO_SCHEMA),
    ).toThrow('versão');
  });
});
