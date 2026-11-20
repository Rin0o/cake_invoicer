import * as backupModulo from '@/backup/backup';
import { gerarBackup, restaurarBackup, TABELAS, validarBackup } from '@/backup/backup';
import { migrar, MIGRATIONS, VERSAO_SCHEMA } from '@/db/migrations';
import * as repo from '@/db/repo';
import { abrirBaseDeTeste } from '@/db/testDb';
import { formatarNumero } from '@/domain/numero';
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
      valor_hora_cent: 2000, custo_indireto_pct: 5, margem_pct: 10, nome_negocio: '',
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
    expect((await repo.listarOrcamentos(db, { pesquisa: 'ana' })).map((o) => o.id)).toEqual([a]);
    expect((await repo.listarOrcamentos(db, { pesquisa: '%' })).map((o) => o.id)).toEqual([b]);
    expect(await repo.listarOrcamentos(db)).toHaveLength(2);
  });

  it('pesquisa pelo título e pelo número', async () => {
    const db = await novaBase();
    const a = await repo.criarOrcamento(db, { hoje: '2026-11-19' });
    const b = await repo.criarOrcamento(db, { hoje: '2026-11-19' });
    await repo.atualizarOrcamento(db, a, { cliente: 'Ana', titulo: 'Aniversário 5 anos' });
    await repo.atualizarOrcamento(db, b, { cliente: 'Ana', titulo: 'Batizado' });
    const ids = async (pesquisa: string) => (await repo.listarOrcamentos(db, { pesquisa })).map((o) => o.id);
    expect(await ids('batiz')).toEqual([b]);
    expect(await ids('2026-001')).toEqual([a]);
    expect(await ids(' 002 ')).toEqual([b]);
  });

  it('numera por ano, sem reutilizar números apagados', async () => {
    const db = await novaBase();
    const numero = async (id: number) => formatarNumero((await repo.obterOrcamento(db, id))!);
    const a = await repo.criarOrcamento(db, { hoje: '2026-12-30' });
    const b = await repo.criarOrcamento(db, { hoje: '2026-12-31' });
    expect([await numero(a), await numero(b)]).toEqual(['2026-001', '2026-002']);

    await repo.apagarOrcamento(db, b);
    const c = await repo.criarOrcamento(db, { hoje: '2026-12-31' });
    expect(await numero(c)).toBe('2026-003');

    const d = await repo.criarOrcamento(db, { hoje: '2027-01-01' });
    expect(await numero(d)).toBe('2027-001');
  });

  it('filtra por estado e combina com a pesquisa', async () => {
    const db = await novaBase();
    const a = await repo.criarOrcamento(db);
    const b = await repo.criarOrcamento(db);
    await repo.atualizarOrcamento(db, a, { cliente: 'Ana', estado: 'aceite' });
    await repo.atualizarOrcamento(db, b, { cliente: 'Ana Rita' });
    expect((await repo.listarOrcamentos(db, { estado: 'aceite' })).map((o) => o.id)).toEqual([a]);
    expect((await repo.listarOrcamentos(db, { estado: 'rascunho', pesquisa: 'ana' })).map((o) => o.id)).toEqual([b]);
    expect(await repo.listarOrcamentos(db, { estado: 'entregue' })).toHaveLength(0);
  });

  it('ordena: próximas entregas primeiro, depois as passadas, e sem data no fim', async () => {
    const db = await novaBase();
    const criar = async (cliente: string, data_entrega: string | null) => {
      const id = await repo.criarOrcamento(db);
      await repo.atualizarOrcamento(db, id, { cliente, data_entrega });
      return id;
    };
    await criar('sem data', null);
    await criar('passada antiga', '2027-01-02');
    await criar('daqui a uma semana', '2027-03-17');
    await criar('hoje', '2027-03-10');
    await criar('passada recente', '2027-03-01');
    await criar('amanhã', '2027-03-11');
    const ordem = (await repo.listarOrcamentos(db, { hoje: '2027-03-10' })).map((o) => o.cliente);
    expect(ordem).toEqual(['hoje', 'amanhã', 'daqui a uma semana', 'passada recente', 'passada antiga', 'sem data']);
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

describe('receitas', () => {
  async function preparar() {
    const db = await novaBase();
    const farinha = await itemFarinha(db);
    const caixaId = await repo.criarItem(db, {
      tipo: 'material', nome: 'Caixa', unidade: 'un', preco_unidade_cent: 150, ativo: 1,
    });
    const rid = await repo.criarReceita(db, 'Massa de baunilha');
    await repo.adicionarLinhaReceitaItem(db, rid, farinha.id, 0.5, 'g'); // 0,60 €
    await repo.adicionarLinhaReceitaItem(db, rid, caixaId, 1, 'un'); // 1,50 €
    await repo.adicionarLinhaReceitaLivre(db, rid, 'Corante', 100); // 1,00 €
    return { db, farinha, caixaId, rid };
  }

  it('guarda linhas com os dados atuais do catálogo', async () => {
    const { db, farinha, rid } = await preparar();
    let r = (await repo.obterReceita(db, rid))!;
    expect(r.linhas.map((l) => l.nome)).toEqual(['Farinha', 'Caixa', 'Corante']);
    expect(r.linhas.map((l) => l.preco_unit_cent)).toEqual([120, 150, 100]);

    // a receita usa sempre o preço atual
    await repo.atualizarItem(db, farinha.id, { ...farinha, nome: 'Farinha T65', preco_unidade_cent: 200 });
    r = (await repo.obterReceita(db, rid))!;
    expect(r.linhas[0].nome).toBe('Farinha T65');
    expect(r.linhas[0].preco_unit_cent).toBe(200);
    expect((await repo.listarReceitas(db))[0].n_linhas).toBe(3);
  });

  it('aplicar a um bolo copia as linhas com escala só nos ingredientes', async () => {
    const { db, rid } = await preparar();
    const oid = await repo.criarOrcamento(db);
    await repo.atualizarOrcamento(db, oid, { margem_pct: 0 });
    await db.execAsync(`UPDATE orcamentos SET indireto_pct = 0 WHERE id = ${oid}`);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;

    await repo.aplicarReceita(db, boloId, rid, 1.5);
    const o = (await repo.obterOrcamento(db, oid))!;
    const b = o.bolos[0];
    expect(b.nome).toBe('Massa de baunilha'); // bolo vazio com nome por omissão
    expect(b.linhas.map((l) => [l.descricao, l.quantidade, l.livre])).toEqual([
      ['Farinha', 0.75, 0],
      ['Caixa', 1, 0],
      ['Corante', 1, 1],
    ]);
    expect(b.linhas.map((l) => l.unidade_entrada)).toEqual(['g', 'un', 'un']);
    // 0,75 × 1,20 + 1,50 + 1,00 = 3,40 → 3 €
    expect(o.total_cent).toBe(300);
  });

  it('juntar receitas ao mesmo bolo mantém as linhas e o nome', async () => {
    const { db, rid } = await preparar();
    const oid = await repo.criarOrcamento(db);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;
    await repo.atualizarBolo(db, boloId, { nome: 'Aniversário Rui' });
    await repo.aplicarReceita(db, boloId, rid, 1);
    await repo.aplicarReceita(db, boloId, rid, 2);
    const b = (await repo.obterOrcamento(db, oid))!.bolos[0];
    expect(b.nome).toBe('Aniversário Rui');
    expect(b.linhas).toHaveLength(6);
    expect(b.linhas.map((l) => l.ordem)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(b.linhas[3].quantidade).toBe(1); // farinha 0,5 × 2
  });

  it('o bolo não depende da receita depois de aplicada', async () => {
    const { db, farinha, rid } = await preparar();
    const oid = await repo.criarOrcamento(db);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;
    await repo.aplicarReceita(db, boloId, rid, 1);

    const linhaFarinha = (await repo.obterReceita(db, rid))!.linhas[0];
    await repo.atualizarLinhaReceita(db, linhaFarinha.id, { quantidade: 5, unidade_entrada: 'kg' });
    await repo.atualizarItem(db, farinha.id, { ...farinha, preco_unidade_cent: 999 });
    await repo.apagarReceita(db, rid);

    const l = (await repo.obterOrcamento(db, oid))!.bolos[0].linhas[0];
    expect(l.quantidade).toBe(0.5);
    expect(l.preco_unit_cent).toBe(120);
    expect(await repo.obterReceita(db, rid)).toBeNull();
    expect(await db.getAllAsync('SELECT * FROM receita_linhas')).toHaveLength(0);
  });

  it('recusa receitas vazias e escalas inválidas', async () => {
    const { db, rid } = await preparar();
    const vazia = await repo.criarReceita(db);
    const oid = await repo.criarOrcamento(db);
    const boloId = (await repo.obterOrcamento(db, oid))!.bolos[0].id;
    await expect(repo.aplicarReceita(db, boloId, vazia, 1)).rejects.toThrow('não tem linhas');
    await expect(repo.aplicarReceita(db, boloId, rid, 0)).rejects.toThrow('escala');
    await expect(repo.aplicarReceita(db, boloId, 999, 1)).rejects.toThrow('já não existe');
    expect((await repo.obterOrcamento(db, oid))!.bolos[0].linhas).toHaveLength(0);
  });

  it('editar, remover linhas e renomear', async () => {
    const { db, rid } = await preparar();
    let r = (await repo.obterReceita(db, rid))!;
    const livre = r.linhas[2];
    await repo.atualizarLinhaReceita(db, livre.id, { descricao: 'Corante gel', valor_cent: 250 });
    expect((await repo.obterLinhaReceita(db, livre.id))!.nome).toBe('Corante gel');
    await repo.apagarLinhaReceita(db, r.linhas[1].id);
    await repo.atualizarReceita(db, rid, { nome: 'Massa', notas: 'forma de 20 cm' });
    r = (await repo.obterReceita(db, rid))!;
    expect(r.nome).toBe('Massa');
    expect(r.notas).toBe('forma de 20 cm');
    expect(r.linhas.map((l) => l.preco_unit_cent)).toEqual([120, 250]);
    expect((await repo.listarReceitas(db, 'mas')).map((x) => x.id)).toEqual([rid]);
    expect(await repo.listarReceitas(db, 'chocolate')).toHaveLength(0);
  });

  it('não deixa apagar nem mudar a unidade de um item usado numa receita', async () => {
    const { db, farinha, rid } = await preparar();
    expect(await repo.receitasComItem(db, farinha.id)).toEqual(['Massa de baunilha']);
    await expect(repo.apagarItem(db, farinha.id)).rejects.toThrow('Massa de baunilha');
    await expect(repo.atualizarItem(db, farinha.id, { ...farinha, unidade: 'l' })).rejects.toThrow('unidade');
    // mudar o resto continua possível
    await repo.atualizarItem(db, farinha.id, { ...farinha, preco_unidade_cent: 130, ativo: 0 });

    // depois de sair da receita, já se pode apagar
    const linha = (await repo.obterReceita(db, rid))!.linhas[0];
    await repo.apagarLinhaReceita(db, linha.id);
    await repo.apagarItem(db, farinha.id);
    expect(await repo.obterItem(db, farinha.id)).toBeNull();
  });
});

describe('migração v1 → v2', () => {
  it('mantém os dados de uma base da versão 0.1.0', async () => {
    // O backup automático corre a sério sobre a base v1 (só não grava o ficheiro).
    let backupAntes: backupModulo.Backup | null = null;
    const espiao = jest.spyOn(backupModulo, 'guardarBackupAutomatico').mockImplementation(async (base) => {
      backupAntes = await backupModulo.gerarBackup(base);
    });
    const db = abrirBaseDeTeste();
    await db.execAsync(MIGRATIONS[0]);
    await db.execAsync('PRAGMA user_version = 1');
    await db.execAsync(`UPDATE definicoes SET nome_negocio = 'Doces', contacto = '912' WHERE id = 1`);
    await db.execAsync(
      `INSERT INTO items (tipo, nome, unidade, preco_unidade_cent, atualizado_em)
       VALUES ('ingrediente', 'Açúcar', 'kg', 100, '2026-01-01')`,
    );

    await migrar(db);

    expect(espiao).toHaveBeenCalledWith(db, 'pre-migracao-v1');
    // o backup de antes da migração tem os dados v1 completos e volta a importar
    const antes = backupAntes as backupModulo.Backup | null;
    expect(antes!.versao_schema).toBe(1);
    expect(antes!.tabelas.definicoes[0].contacto).toBe('912');
    expect(antes!.tabelas.items).toHaveLength(1);
    const outra = await novaBase();
    await restaurarBackup(outra, validarBackup(JSON.parse(JSON.stringify(antes)), VERSAO_SCHEMA));
    expect((await repo.listarItens(outra)).map((i) => i.nome)).toEqual(['Açúcar']);
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(VERSAO_SCHEMA);
    const d = await repo.obterDefinicoes(db);
    expect(d.nome_negocio).toBe('Doces');
    expect('contacto' in d).toBe(false);
    expect((await repo.listarItens(db)).map((i) => i.nome)).toEqual(['Açúcar']);
    expect(await repo.listarReceitas(db)).toEqual([]);
    espiao.mockRestore();
  });
});

describe('migração v2 → v3', () => {
  it('numera os orçamentos existentes por ano e continua a numeração', async () => {
    const espiao = jest.spyOn(backupModulo, 'guardarBackupAutomatico').mockResolvedValue();
    const db = abrirBaseDeTeste();
    await db.execAsync(MIGRATIONS[0]);
    await db.execAsync(MIGRATIONS[1]);
    await db.execAsync('PRAGMA user_version = 2');
    const inserir = (cliente: string, criado: string) =>
      db.runAsync(
        `INSERT INTO orcamentos (cliente, valor_hora_cent, indireto_pct, margem_pct, criado_em, atualizado_em)
         VALUES (?, 1000, 10, 30, ?, ?)`,
        cliente, criado, criado,
      );
    await inserir('Dezembro', '2026-12-01T10:00:00.000Z');
    await inserir('Novembro', '2026-11-01T10:00:00.000Z');
    await inserir('Janeiro', '2027-01-05T10:00:00.000Z');

    await migrar(db);

    expect(espiao).toHaveBeenCalledWith(db, 'pre-migracao-v2');
    const lista = await repo.listarOrcamentos(db);
    const porCliente = Object.fromEntries(lista.map((o) => [o.cliente, formatarNumero(o)]));
    expect(porCliente).toEqual({ Novembro: '2026-001', Dezembro: '2026-002', Janeiro: '2027-001' });
    expect(lista.every((o) => o.titulo === '')).toBe(true);

    const novo = await repo.criarOrcamento(db, { hoje: '2026-12-20' });
    expect(formatarNumero((await repo.obterOrcamento(db, novo))!)).toBe('2026-003');
    espiao.mockRestore();
  });
});

describe('backup', () => {
  it('restaura números e título, e a numeração continua depois do maior', async () => {
    const origem = await novaBase();
    const a = await repo.criarOrcamento(origem, { hoje: '2026-11-19' });
    const b = await repo.criarOrcamento(origem, { hoje: '2026-11-19' });
    await repo.atualizarOrcamento(origem, a, { titulo: 'Batizado' });
    await repo.apagarOrcamento(origem, b); // o 002 fica "gasto"
    const backup = validarBackup(JSON.parse(JSON.stringify(await gerarBackup(origem))), VERSAO_SCHEMA);

    const destino = await novaBase();
    await restaurarBackup(destino, backup);
    const o = (await repo.obterOrcamento(destino, a))!;
    expect([formatarNumero(o), o.titulo]).toEqual(['2026-001', 'Batizado']);
    const c = await repo.criarOrcamento(destino, { hoje: '2026-11-20' });
    expect(formatarNumero((await repo.obterOrcamento(destino, c))!)).toBe('2026-003');
  });

  it('importa um backup v2 e numera os orçamentos', async () => {
    const origem = abrirBaseDeTeste();
    await origem.execAsync(MIGRATIONS[0]);
    await origem.execAsync(MIGRATIONS[1]);
    await origem.execAsync('PRAGMA user_version = 2');
    for (const [cliente, criado] of [['B', '2026-11-02T00:00:00.000Z'], ['A', '2026-11-01T00:00:00.000Z']]) {
      await origem.runAsync(
        `INSERT INTO orcamentos (cliente, valor_hora_cent, indireto_pct, margem_pct, criado_em, atualizado_em)
         VALUES (?, 1000, 10, 30, ?, ?)`,
        cliente, criado, criado,
      );
    }
    const v2 = JSON.parse(JSON.stringify(await gerarBackup(origem)));
    expect(v2.versao_schema).toBe(2);

    const destino = await novaBase();
    await restaurarBackup(destino, validarBackup(v2, VERSAO_SCHEMA));
    const lista = await repo.listarOrcamentos(destino);
    expect(Object.fromEntries(lista.map((o) => [o.cliente, formatarNumero(o)]))).toEqual({
      A: '2026-001',
      B: '2026-002',
    });
    const c = await repo.criarOrcamento(destino, { hoje: '2026-11-20' });
    expect(formatarNumero((await repo.obterOrcamento(destino, c))!)).toBe('2026-003');
  });

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

  it('exporta e restaura receitas', async () => {
    const origem = await novaBase();
    const farinha = await itemFarinha(origem);
    const rid = await repo.criarReceita(origem, 'Massa');
    await repo.adicionarLinhaReceitaItem(origem, rid, farinha.id, 0.3, 'g');
    const backup = validarBackup(JSON.parse(JSON.stringify(await gerarBackup(origem))), VERSAO_SCHEMA);

    const destino = await novaBase();
    await restaurarBackup(destino, backup);
    const r = (await repo.obterReceita(destino, rid))!;
    expect(r.nome).toBe('Massa');
    expect(r.linhas[0].nome).toBe('Farinha');
    expect(r.linhas[0].quantidade).toBe(0.3);
  });

  it('importa um backup da versão 0.1.0 (schema v1)', async () => {
    const v1 = {
      app: 'orcamentos-bolos',
      versao_schema: 1,
      exportado_em: '2026-11-01T10:00:00.000Z',
      tabelas: {
        definicoes: [{
          id: 1, valor_hora_cent: 1200, custo_indireto_pct: 10, margem_pct: 30, moeda: 'EUR',
          nome_negocio: 'Doces', contacto: '912', logotipo: null,
        }],
        items: [{ id: 1, tipo: 'ingrediente', nome: 'Farinha', unidade: 'kg', preco_unidade_cent: 120, ativo: 1, atualizado_em: 'x' }],
        orcamentos: [],
        orcamento_bolos: [],
        orcamento_linhas: [],
      },
    };
    const backup = validarBackup(v1, VERSAO_SCHEMA);
    expect(backup.versao_schema).toBe(VERSAO_SCHEMA);
    expect(v1.tabelas).not.toHaveProperty('receitas'); // não altera o original

    const db = await novaBase();
    await restaurarBackup(db, backup);
    expect((await repo.obterDefinicoes(db)).valor_hora_cent).toBe(1200);
    expect((await repo.listarItens(db)).map((i) => i.nome)).toEqual(['Farinha']);
  });

  it('recusa ficheiros que não são backups ou de versões mais recentes', () => {
    expect(() => validarBackup({ foo: 1 }, VERSAO_SCHEMA)).toThrow('não é um backup');
    expect(() =>
      validarBackup({ app: 'orcamentos-bolos', versao_schema: 99, tabelas: {} }, VERSAO_SCHEMA),
    ).toThrow('versão mais recente');
    expect(() =>
      validarBackup({ app: 'orcamentos-bolos', versao_schema: 0, tabelas: {} }, VERSAO_SCHEMA),
    ).toThrow('versão de dados inválida');
    expect(() =>
      validarBackup({ app: 'orcamentos-bolos', versao_schema: VERSAO_SCHEMA, tabelas: {} }, VERSAO_SCHEMA),
    ).toThrow('não tem a tabela');
  });
});
