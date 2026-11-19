import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, FAB, List, Searchbar, Text } from 'react-native-paper';

import { criarOrcamento, listarOrcamentos, type ResumoOrcamento } from '@/db/repo';
import { formatarData, formatarEuroInteiro } from '@/domain/format';
import { mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

function descricao(o: ResumoOrcamento) {
  const partes: string[] = [];
  if (o.data_entrega) partes.push(`Entrega ${formatarData(o.data_entrega)}`);
  partes.push(o.n_bolos === 1 ? '1 bolo' : `${o.n_bolos} bolos`);
  return partes.join(' · ');
}

export default function Orcamentos() {
  const db = useSQLiteContext();
  const [pesquisa, setPesquisa] = useState('');
  const [lista, setLista] = useState<ResumoOrcamento[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarOrcamentos(db, pesquisa).then(setLista).catch(mostrarErro);
    }, [db, pesquisa]),
  );

  async function novo() {
    try {
      const id = await criarOrcamento(db);
      router.push({ pathname: '/orcamento/[id]', params: { id: String(id) } });
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <View style={styles.ecra}>
      <Searchbar
        placeholder="Pesquisar cliente"
        value={pesquisa}
        onChangeText={setPesquisa}
        style={styles.pesquisa}
      />
      <FlatList
        data={lista}
        keyExtractor={(o) => String(o.id)}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {pesquisa ? 'Nenhum orçamento encontrado.' : 'Ainda não há orçamentos.\nToque em + para criar o primeiro.'}
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
  lista: { paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, color: tema.colors.onSurfaceVariant },
  semCliente: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  total: { alignSelf: 'center' },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
