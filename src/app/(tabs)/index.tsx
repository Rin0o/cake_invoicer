import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, FAB, List, Searchbar, Text } from 'react-native-paper';

import { criarOrcamento, listarOrcamentos, type ResumoOrcamento } from '@/db/repo';
import { ESTADOS, NOME_ESTADO, type EstadoOrcamento } from '@/domain/estados';
import { formatarData, formatarEuroInteiro } from '@/domain/format';
import { mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

function descricao(o: ResumoOrcamento) {
  const partes: string[] = [NOME_ESTADO[o.estado]];
  if (o.data_entrega) partes.push(`Entrega ${formatarData(o.data_entrega)}`);
  partes.push(o.n_bolos === 1 ? '1 bolo' : `${o.n_bolos} bolos`);
  return partes.join(' · ');
}

export default function Orcamentos() {
  const db = useSQLiteContext();
  const [pesquisa, setPesquisa] = useState('');
  const [estado, setEstado] = useState<EstadoOrcamento | null>(null);
  const [lista, setLista] = useState<ResumoOrcamento[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarOrcamentos(db, { pesquisa, estado }).then(setLista).catch(mostrarErro);
    }, [db, pesquisa, estado]),
  );

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
        placeholder="Pesquisar cliente"
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
            <Chip key={e} selected={estado === e} showSelectedOverlay onPress={() => setEstado(estado === e ? null : e)}>
              {NOME_ESTADO[e]}
            </Chip>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(o) => String(o.id)}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {filtrado ? 'Nenhum orçamento encontrado.' : 'Ainda não há orçamentos.\nToque em + para criar o primeiro.'}
          </Text>
        }
        renderItem={({ item: o }) => (
          <List.Item
            title={o.cliente || 'Sem cliente'}
            titleStyle={!o.cliente && styles.semCliente}
            description={descricao(o)}
            onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: String(o.id) } })}
            right={() => (
              <Text variant="titleMedium" style={styles.total}>
                {formatarEuroInteiro(o.total_cent)}
              </Text>
            )}
          />
        )}
      />
      <FAB icon="plus" label="Novo" style={styles.fab} onPress={novo} />
    </View>
  );
}

const styles = StyleSheet.create({
  ecra: { flex: 1 },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s },
  filtros: { gap: espaco.s, paddingHorizontal: espaco.m, paddingBottom: espaco.s },
  lista: { paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, color: tema.colors.onSurfaceVariant },
  semCliente: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  total: { alignSelf: 'center' },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
