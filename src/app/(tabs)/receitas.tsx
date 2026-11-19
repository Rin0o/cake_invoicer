import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, FAB, List, Searchbar, Text } from 'react-native-paper';

import { criarReceita, listarReceitas, type ResumoReceita } from '@/db/repo';
import { mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

export default function Receitas() {
  const db = useSQLiteContext();
  const [pesquisa, setPesquisa] = useState('');
  const [lista, setLista] = useState<ResumoReceita[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarReceitas(db, pesquisa).then(setLista).catch(mostrarErro);
    }, [db, pesquisa]),
  );

  async function nova() {
    try {
      const id = await criarReceita(db);
      router.push({ pathname: '/receita/[id]', params: { id: String(id) } });
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <View style={styles.ecra}>
      <Searchbar placeholder="Pesquisar receita" value={pesquisa} onChangeText={setPesquisa} style={styles.pesquisa} />
      <FlatList
        data={lista}
        keyExtractor={(r) => String(r.id)}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {pesquisa
              ? 'Nenhuma receita encontrada.'
              : 'Ainda não há receitas.\nUma receita junta ingredientes e materiais do catálogo, para os adicionar a um bolo de uma vez.\nToque em + para criar.'}
          </Text>
        }
        renderItem={({ item: r }) => (
          <List.Item
            title={r.nome || 'Sem nome'}
            titleStyle={!r.nome && styles.semNome}
            description={r.n_linhas === 1 ? '1 linha' : `${r.n_linhas} linhas`}
            onPress={() => router.push({ pathname: '/receita/[id]', params: { id: String(r.id) } })}
          />
        )}
      />
      <FAB icon="plus" label="Nova" style={styles.fab} onPress={nova} />
    </View>
  );
}

const styles = StyleSheet.create({
  ecra: { flex: 1 },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s },
  lista: { paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, marginHorizontal: espaco.l, color: tema.colors.onSurfaceVariant },
  semNome: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
