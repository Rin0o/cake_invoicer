import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, FAB, Searchbar, SegmentedButtons, Text } from 'react-native-paper';

import {
  atualizarOrcamento,
  contarPorGrupo,
  criarOrcamento,
  listarOrcamentos,
  type ResumoOrcamento,
} from '@/db/repo';
import {
  avisoMudancaDeGrupo,
  ESTADOS,
  ESTADOS_DO_GRUPO,
  GRUPOS,
  NOME_ESTADO,
  NOME_GRUPO,
  type EstadoOrcamento,
  type GrupoOrcamentos,
} from '@/domain/estados';
import { formatarData, formatarEuroInteiro } from '@/domain/format';
import { formatarNumero } from '@/domain/numero';
import { CartaoLista, Etiqueta } from '@/ui/CartaoLista';
import { mostrarErro } from '@/ui/confirmar';
import { DialogoEstado } from '@/ui/Estado';
import { avisar } from '@/ui/Guardar';
import { COR_ESTADO, espaco, estiloChipEstado, tema } from '@/ui/theme';


export default function Orcamentos() {
  const db = useSQLiteContext();
  const [pesquisa, setPesquisa] = useState('');
  const [grupo, setGrupo] = useState<GrupoOrcamentos>('abertos');
  const [estado, setEstado] = useState<EstadoOrcamento | null>(null);
  const [lista, setLista] = useState<ResumoOrcamento[]>([]);
  const [contagem, setContagem] = useState<Record<GrupoOrcamentos, number> | null>(null);
  /** Orçamento cujo estado se está a mudar (toque longo). */
  const [aMudar, setAMudar] = useState<ResumoOrcamento | null>(null);

  // A pesquisa procura em todas as listas, para um orçamento antigo nunca "desaparecer".
  const aPesquisar = pesquisa.trim() !== '';
  const estadosVisiveis: readonly EstadoOrcamento[] = aPesquisar ? ESTADOS : ESTADOS_DO_GRUPO[grupo];
  // Um filtro de estado que não existe na lista atual deixa de se aplicar.
  const estadoAtivo = estado && estadosVisiveis.includes(estado) ? estado : null;

  const carregar = useCallback(() => {
    listarOrcamentos(db, { pesquisa, estado: estadoAtivo, grupo: aPesquisar ? null : grupo })
      .then(setLista)
      .catch(mostrarErro);
    contarPorGrupo(db).then(setContagem).catch(mostrarErro);
  }, [db, pesquisa, estadoAtivo, grupo, aPesquisar]);

  useFocusEffect(carregar);

  function escolherGrupo(g: GrupoOrcamentos) {
    setGrupo(g);
    setEstado(null);
  }

  async function mudarEstado(o: ResumoOrcamento, novo: EstadoOrcamento) {
    try {
      await atualizarOrcamento(db, o.id, { estado: novo });
      const aviso = avisoMudancaDeGrupo(o.estado, novo);
      avisar(`${o.cliente || 'Orçamento'}: ${NOME_ESTADO[novo]}${aviso ? `. ${aviso}` : ''}`);
      carregar();
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function novo() {
    try {
      const id = await criarOrcamento(db);
      router.push({ pathname: '/orcamento/[id]', params: { id: String(id) } });
    } catch (e) {
      mostrarErro(e);
    }
  }

  const filtrado = aPesquisar || estadoAtivo !== null;

  function textoVazio() {
    if (filtrado) return 'Nenhum orçamento encontrado.';
    if (grupo === 'entregues') return 'Ainda não há orçamentos entregues.';
    if (grupo === 'recusados') return 'Nenhum orçamento recusado.';
    if (contagem && contagem.entregues + contagem.recusados > 0) {
      return 'Não há orçamentos abertos.\nToque em + para criar um novo.';
    }
    return 'Ainda não há orçamentos.\nToque em + para criar o primeiro.';
  }

  return (
    <View style={styles.ecra}>
      <Searchbar
        placeholder="Pesquisar cliente, pedido, nº ou ref."
        value={pesquisa}
        onChangeText={setPesquisa}
        style={styles.pesquisa}
      />
      {aPesquisar ? (
        <Text variant="labelMedium" style={styles.aviso}>
          A procurar em todos os orçamentos
        </Text>
      ) : (
        <SegmentedButtons
          value={grupo}
          onValueChange={(v) => escolherGrupo(v as GrupoOrcamentos)}
          style={styles.grupos}
          buttons={GRUPOS.map((g) => {
            const n = contagem?.[g];
            return {
              value: g,
              label: n ? `${NOME_GRUPO[g]} (${n})` : NOME_GRUPO[g],
              accessibilityLabel: `${NOME_GRUPO[g]}${n !== undefined ? `, ${n}` : ''}`,
              labelStyle: styles.grupoTexto,
            };
          })}
        />
      )}
      {/* Nas listas com um só estado (entregues, recusados) não há nada para filtrar. */}
      {estadosVisiveis.length > 1 ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
            <Chip selected={estadoAtivo === null} showSelectedOverlay onPress={() => setEstado(null)}>
              Todos
            </Chip>
            {estadosVisiveis.map((e) => (
              <Chip
                key={e}
                selected={estadoAtivo === e}
                showSelectedOverlay
                {...estiloChipEstado(e, estadoAtivo === e)}
                onPress={() => setEstado(estadoAtivo === e ? null : e)}>
                {NOME_ESTADO[e]}
              </Chip>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <FlatList
        data={lista}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {textoVazio()}
          </Text>
        }
        renderItem={({ item: o }) => {
          const cor = COR_ESTADO[o.estado];
          return (
            <CartaoLista
              titulo={o.cliente || 'Sem cliente'}
              tituloEstilo={!o.cliente && styles.semCliente}
              icone={cor.icone}
              corIcone={cor.texto}
              fundoIcone={cor.fundo}
              descricao={
                <>
                  {o.titulo ? (
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {o.titulo}
                    </Text>
                  ) : null}
                  <View style={styles.linhaDetalhes}>
                    <Etiqueta texto={NOME_ESTADO[o.estado]} cor={cor.texto} fundo={cor.fundo} />
                    {o.data_entrega ? (
                      <View style={styles.entrega} accessibilityLabel={`Entrega ${formatarData(o.data_entrega)}`}>
                        <MaterialCommunityIcons
                          name="calendar-month-outline"
                          size={14}
                          color={tema.colors.onSurfaceVariant}
                        />
                        <Text variant="bodySmall" numberOfLines={1} style={styles.detalhes}>
                          {formatarData(o.data_entrega)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              }
              direita={
                <View style={styles.direita}>
                  <Text variant="labelMedium" style={styles.numero} accessibilityLabel={`Número ${formatarNumero(o)}`}>
                    {formatarNumero(o)}
                  </Text>
                  <Text variant="titleMedium" style={styles.total}>
                    {formatarEuroInteiro(o.total_cent)}
                  </Text>
                </View>
              }
              onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: String(o.id) } })}
              onLongPress={() => setAMudar(o)}
              dicaAcessibilidade="Toque longo para mudar o estado"
            />
          );
        }}
      />
      <DialogoEstado
        visivel={aMudar !== null}
        titulo={aMudar ? aMudar.cliente || `Orçamento ${formatarNumero(aMudar)}` : 'Mudar estado'}
        estado={aMudar?.estado ?? null}
        aoEscolher={(e) => aMudar && mudarEstado(aMudar, e)}
        aoFechar={() => setAMudar(null)}
      />
      <FAB icon="plus" label="Novo" style={styles.fab} onPress={novo} />
    </View>
  );
}

const styles = StyleSheet.create({
  ecra: { flex: 1 },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s, backgroundColor: tema.colors.surface },
  grupos: { marginHorizontal: espaco.m, marginBottom: espaco.s },
  grupoTexto: { marginHorizontal: 0, fontSize: 13 },
  aviso: { marginHorizontal: espaco.m, marginBottom: espaco.s, color: tema.colors.onSurfaceVariant },
  filtros: { gap: espaco.s, paddingHorizontal: espaco.m, paddingBottom: espaco.s },
  lista: { paddingTop: espaco.xs, paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, color: tema.colors.onSurfaceVariant },
  semCliente: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  linhaDetalhes: { flexDirection: 'row', alignItems: 'center', gap: espaco.s },
  entrega: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  detalhes: { flexShrink: 1, color: tema.colors.onSurfaceVariant },
  direita: { alignItems: 'flex-end', gap: 2 },
  numero: { color: tema.colors.onSurfaceVariant },
  total: { fontWeight: 'bold', color: tema.colors.primary },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
