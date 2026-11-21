/**
 * Adicionar ou editar uma linha de um bolo.
 *
 * Parâmetros:
 * - `boloId`            → nova linha de item (escolher do catálogo)
 * - `boloId` + `livre`  → nova linha livre (descrição + valor)
 * - `linhaId`           → editar linha existente
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import {
  adicionarLinhaItem,
  adicionarLinhaLivre,
  apagarLinha,
  atualizarLinha,
  obterLinha,
  type Item,
  type Linha,
} from '@/db/repo';
import { textos } from '@/i18n';
import { mostrarErro } from '@/ui/confirmar';
import { EscolherItem, FormLivre, FormQuantidade } from '@/ui/FormulariosLinha';

export default function EditarLinha() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ boloId?: string; linhaId?: string; livre?: string }>();
  const linhaId = params.linhaId ? Number(params.linhaId) : null;
  const boloId = Number(params.boloId);

  const [linha, setLinha] = useState<Linha | null>(null);
  const [carregado, setCarregado] = useState(linhaId === null);
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (linhaId === null) return;
    obterLinha(db, linhaId)
      .then((l) => {
        setLinha(l);
        setCarregado(true);
      })
      .catch(mostrarErro);
  }, [db, linhaId]);

  const t = textos();
  if (!carregado) return <Stack.Screen options={{ title: t.ecras.linha }} />;

  // Numa linha existente usa-se o nome e o preço copiados quando foi adicionada.
  if (linha) {
    const remover = () => apagarLinha(db, linha.id);
    return linha.livre ? (
      <FormLivre
        titulo={t.linhas.editarLinhaLivre}
        inicial={{ descricao: linha.descricao, valorCent: linha.preco_unit_cent }}
        aoGuardar={(descricao, cent) => atualizarLinha(db, linha.id, { descricao, preco_unit_cent: cent })}
        aoRemover={remover}
      />
    ) : (
      <FormQuantidade
        titulo={t.linhas.editarQuantidade}
        nome={linha.descricao}
        unidade={linha.unidade}
        precoUnitCent={linha.preco_unit_cent}
        notaPreco={t.linhas.notaPrecoOrcamento}
        inicial={{ quantidade: linha.quantidade, unidadeEntrada: linha.unidade_entrada }}
        aoGuardar={(quantidade, unidade_entrada) => atualizarLinha(db, linha.id, { quantidade, unidade_entrada })}
        aoRemover={remover}
      />
    );
  }

  if (params.livre) {
    return (
      <FormLivre
        titulo={t.comum.linhaLivre}
        aoGuardar={(descricao, cent) => adicionarLinhaLivre(db, boloId, descricao, cent)}
      />
    );
  }
  if (!item) return <EscolherItem aoEscolher={setItem} />;
  return (
    <FormQuantidade
      titulo={t.linhas.quantidadeUsada}
      nome={item.nome}
      unidade={item.unidade}
      precoUnitCent={item.preco_unidade_cent}
      aoGuardar={(q, unidade) => adicionarLinhaItem(db, boloId, item, q, unidade)}
      aoVoltar={() => setItem(null)}
    />
  );
}
