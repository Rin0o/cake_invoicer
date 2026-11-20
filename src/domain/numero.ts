/**
 * Número do orçamento: sequencial por ano ("2026-014"). Atribuído ao criar e nunca
 * reutilizado (o último número de cada ano fica na tabela `numeracao`). É público: aparece
 * no PDF e no texto enviados ao cliente.
 */

export interface NumeroOrcamento {
  numero_ano: number;
  numero_seq: number;
}

/** 2026, 14 → "2026-014". Com mais de 999 no ano, cresce ("2026-1000"). */
export function formatarNumero(n: NumeroOrcamento): string {
  return `${n.numero_ano}-${String(n.numero_seq).padStart(3, '0')}`;
}

/**
 * Numera orçamentos que ainda não têm número, por ordem de criação dentro de cada ano
 * (o ano de `criado_em`). Mesma regra da migração v3; usado para converter backups antigos.
 */
export function numerarPorAno<T extends { id: number; criado_em: string }>(
  orcamentos: T[],
): (T & NumeroOrcamento)[] {
  const ordenados = [...orcamentos].sort((a, b) =>
    a.criado_em === b.criado_em ? a.id - b.id : a.criado_em < b.criado_em ? -1 : 1,
  );
  const contador = new Map<number, number>();
  const numeros = new Map<number, NumeroOrcamento>();
  for (const o of ordenados) {
    const ano = Number(o.criado_em.slice(0, 4));
    const seq = (contador.get(ano) ?? 0) + 1;
    contador.set(ano, seq);
    numeros.set(o.id, { numero_ano: ano, numero_seq: seq });
  }
  return orcamentos.map((o) => ({ ...o, ...numeros.get(o.id)! }));
}

/** Último número usado em cada ano (para a tabela `numeracao`). */
export function ultimosPorAno(orcamentos: NumeroOrcamento[]): { ano: number; ultimo: number }[] {
  const m = new Map<number, number>();
  for (const o of orcamentos) m.set(o.numero_ano, Math.max(m.get(o.numero_ano) ?? 0, o.numero_seq));
  return [...m].sort((a, b) => a[0] - b[0]).map(([ano, ultimo]) => ({ ano, ultimo }));
}
