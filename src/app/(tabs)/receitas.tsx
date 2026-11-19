import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Searchbar, Text } from 'react-native-paper';

import { criarReceita, listarReceitas, type ResumoReceita } from '@/db/repo';
import { CartaoLista } from '@/ui/CartaoLista';
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
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {pesquisa
              ? 'Nenhuma receita encontrada.'
              : 'Ainda não há receitas.\nUma receita junta ingredientes e materiais do catálogo, para os adicionar a um bolo de uma vez.\nToque em + para criar.'}
          </Text>
        }
        renderItem={({ item: r }) => (
          <CartaoLista
            titulo={r.nome || 'Sem nome'}
            tituloEstilo={!r.nome && styles.semNome}
            descricao={r.n_linhas === 1 ? '1 linha' : `${r.n_linhas} linhas`}
            icone="book-open-variant"
            corIcone={tema.colors.onPrimaryContainer}
            fundoIcone={tema.colors.primaryContainer}
            direita={<MaterialCommunityIcons name="chevron-right" size={24} color={tema.colors.outline} />}
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
  pesquisa: { margin: espaco.m, marginBottom: espaco.s, backgroundColor: tema.colors.surface },
  lista: { paddingTop: espaco.xs, paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, marginHorizontal: espaco.l, color: tema.colors.onSurfaceVariant },
  semNome: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
