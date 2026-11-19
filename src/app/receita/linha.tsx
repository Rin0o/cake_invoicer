/**
 * Adicionar ou editar uma linha de uma receita.
 *
 * Parâmetros:
 * - `receitaId`            → nova linha de item (escolher do catálogo)
 * - `receitaId` + `livre`  → nova linha livre
 * - `linhaId`              → editar linha existente
 *
 * Nas receitas o preço mostrado é sempre o atual do catálogo.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import {
  adicionarLinhaReceitaItem,
  adicionarLinhaReceitaLivre,
  apagarLinhaReceita,
  atualizarLinhaReceita,
  obterLinhaReceita,
  type Item,
  type LinhaReceitaDetalhe,
} from '@/db/repo';
import { mostrarErro } from '@/ui/confirmar';
import { EscolherItem, FormLivre, FormQuantidade } from '@/ui/FormulariosLinha';

export default function EditarLinhaReceita() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ receitaId?: string; linhaId?: string; livre?: string }>();
  const linhaId = params.linhaId ? Number(params.linhaId) : null;
  const receitaId = Number(params.receitaId);

  const [linha, setLinha] = useState<LinhaReceitaDetalhe | null>(null);
  const [carregado, setCarregado] = useState(linhaId === null);
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (linhaId === null) return;
    obterLinhaReceita(db, linhaId)
      .then((l) => {
        setLinha(l);
        setCarregado(true);
      })
      .catch(mostrarErro);
  }, [db, linhaId]);

  if (!carregado) return <Stack.Screen options={{ title: 'Linha' }} />;

  if (linha) {
    const remover = () => apagarLinhaReceita(db, linha.id);
    return linha.livre ? (
      <FormLivre
        titulo="Editar linha livre"
        inicial={{ descricao: linha.descricao, valorCent: linha.valor_cent ?? 0 }}
        aoGuardar={(descricao, cent) => atualizarLinhaReceita(db, linha.id, { descricao, valor_cent: cent })}
        aoRemover={remover}
      />
    ) : (
      <FormQuantidade
        titulo="Editar quantidade"
        nome={linha.nome}
        unidade={linha.unidade}
        precoUnitCent={linha.preco_unit_cent}
        notaPreco="preço atual do catálogo"
        inicial={{ quantidade: linha.quantidade, unidadeEntrada: linha.unidade_entrada }}
        aoGuardar={(quantidade, unidade_entrada) =>
          atualizarLinhaReceita(db, linha.id, { quantidade, unidade_entrada })
        }
        aoRemover={remover}
      />
    );
  }

  if (params.livre) {
    return (
      <FormLivre
        titulo="Linha livre"
        aoGuardar={(descricao, cent) => adicionarLinhaReceitaLivre(db, receitaId, descricao, cent)}
      />
    );
  }
  if (!item) return <EscolherItem aoEscolher={setItem} />;
  return (
    <FormQuantidade
      titulo="Quantidade"
      nome={item.nome}
      unidade={item.unidade}
      precoUnitCent={item.preco_unidade_cent}
      aoGuardar={(q, unidade) => adicionarLinhaReceitaItem(db, receitaId, item.id, q, unidade)}
      aoVoltar={() => setItem(null)}
    />
  );
}
