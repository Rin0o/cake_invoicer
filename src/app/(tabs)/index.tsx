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
  grupoDoEstado,
  nomeEstado,
  nomeGrupo,
  type EstadoOrcamento,
  type GrupoOrcamentos,
} from '@/domain/estados';
import { formatarData, formatarDataDeInstante, formatarEuroInteiro } from '@/domain/format';
import { formatarNumero } from '@/domain/numero';
import { textos } from '@/i18n';
import { CartaoLista, Etiqueta } from '@/ui/CartaoLista';
import { mostrarErro } from '@/ui/confirmar';
import { DialogoEstado } from '@/ui/Estado';
import { avisar } from '@/ui/Guardar';
import { COR_ESTADO, espaco, estiloChipEstado, tema } from '@/ui/theme';


export default function Orcamentos() {
  const db = useSQLiteContext();
  const t = textos();
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
      avisar(`${o.cliente || t.comum.orcamento}: ${nomeEstado(novo)}${aviso ? `. ${aviso}` : ''}`);
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
    if (filtrado) return t.orcamentos.vazioFiltrado;
    if (grupo === 'entregues') return t.orcamentos.vazioEntregues;
    if (grupo === 'recusados') return t.orcamentos.vazioRecusados;
    if (contagem && contagem.entregues + contagem.recusados > 0) {
      return t.orcamentos.vazioAbertos;
    }
    return t.orcamentos.vazio;
  }

  return (
    <View style={styles.ecra}>
      <Searchbar
        placeholder={t.orcamentos.pesquisa}
        value={pesquisa}
        onChangeText={setPesquisa}
        style={styles.pesquisa}
      />
      {aPesquisar ? (
        <Text variant="labelMedium" style={styles.aviso}>
          {t.orcamentos.aProcurarEmTodos}
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
              label: n ? `${nomeGrupo(g)} (${n})` : nomeGrupo(g),
              accessibilityLabel: `${nomeGrupo(g)}${n !== undefined ? `, ${n}` : ''}`,
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
              {t.orcamentos.todos}
            </Chip>
            {estadosVisiveis.map((e) => (
              <Chip
                key={e}
                selected={estadoAtivo === e}
                showSelectedOverlay
                {...estiloChipEstado(e, estadoAtivo === e)}
                onPress={() => setEstado(estadoAtivo === e ? null : e)}>
                {nomeEstado(e)}
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
          // Num entregue ou recusado interessa quando ficou assim, não a entrega prevista.
          const fechado = grupoDoEstado(o.estado) !== 'abertos';
          const data = fechado ? formatarDataDeInstante(o.estado_em) : formatarData(o.data_entrega);
          const rotuloData = fechado
            ? t.orcamentos.dataDoEstado(nomeEstado(o.estado), data)
            : t.orcamentos.entrega(data);
          return (
            <CartaoLista
              titulo={o.cliente || t.comum.semCliente}
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
                    <Etiqueta texto={nomeEstado(o.estado)} cor={cor.texto} fundo={cor.fundo} />
                    {data ? (
                      <View style={styles.entrega} accessibilityLabel={rotuloData}>
                        <MaterialCommunityIcons
                          name={fechado ? 'calendar-check-outline' : 'calendar-month-outline'}
                          size={14}
                          color={tema.colors.onSurfaceVariant}
                        />
                        <Text variant="bodySmall" numberOfLines={1} style={styles.detalhes}>
                          {data}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              }
              direita={
                <View style={styles.direita}>
                  <Text variant="labelMedium" style={styles.numero} accessibilityLabel={t.orcamentos.numero(formatarNumero(o))}>
                    {formatarNumero(o)}
                  </Text>
                  <Text variant="titleMedium" style={styles.total}>
                    {formatarEuroInteiro(o.total_cent)}
                  </Text>
                </View>
              }
              onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: String(o.id) } })}
              onLongPress={() => setAMudar(o)}
              dicaAcessibilidade={t.orcamentos.dicaToqueLongo}
            />
          );
        }}
      />
      <DialogoEstado
        visivel={aMudar !== null}
        titulo={aMudar ? aMudar.cliente || t.comum.orcamentoN(formatarNumero(aMudar)) : t.estados.mudarEstado}
        estado={aMudar?.estado ?? null}
        aoEscolher={(e) => aMudar && mudarEstado(aMudar, e)}
        aoFechar={() => setAMudar(null)}
      />
      <FAB icon="plus" label={t.orcamentos.novo} style={styles.fab} onPress={novo} />
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
