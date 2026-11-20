import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, FAB, Searchbar, Text } from 'react-native-paper';

import { atualizarOrcamento, criarOrcamento, listarOrcamentos, type ResumoOrcamento } from '@/db/repo';
import { ESTADOS, NOME_ESTADO, type EstadoOrcamento } from '@/domain/estados';
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
  const [estado, setEstado] = useState<EstadoOrcamento | null>(null);
  const [lista, setLista] = useState<ResumoOrcamento[]>([]);
  /** Orçamento cujo estado se está a mudar (toque longo). */
  const [aMudar, setAMudar] = useState<ResumoOrcamento | null>(null);

  const carregar = useCallback(() => {
    listarOrcamentos(db, { pesquisa, estado }).then(setLista).catch(mostrarErro);
  }, [db, pesquisa, estado]);

  useFocusEffect(carregar);

  async function mudarEstado(o: ResumoOrcamento, novo: EstadoOrcamento) {
    try {
      await atualizarOrcamento(db, o.id, { estado: novo });
      avisar(`${o.cliente || 'Orçamento'}: ${NOME_ESTADO[novo]}`);
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

  const filtrado = !!pesquisa || estado !== null;

  return (
    <View style={styles.ecra}>
      <Searchbar
        placeholder="Pesquisar cliente, pedido ou nº"
        value={pesquisa}
        onChangeText={setPesquisa}
        style={styles.pesquisa}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          <Chip selected={estado === null} showSelectedOverlay onPress={() => setEstado(null)}>
            Todos
          </Chip>
          {ESTADOS.map((e) => (
            <Chip
              key={e}
              selected={estado === e}
              showSelectedOverlay
              {...estiloChipEstado(e, estado === e)}
              onPress={() => setEstado(estado === e ? null : e)}>
              {NOME_ESTADO[e]}
            </Chip>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {filtrado ? 'Nenhum orçamento encontrado.' : 'Ainda não há orçamentos.\nToque em + para criar o primeiro.'}
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
