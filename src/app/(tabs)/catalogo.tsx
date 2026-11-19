import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, FAB, List, Searchbar, SegmentedButtons, Text } from 'react-native-paper';

import { listarItens, type Item, type TipoItem } from '@/db/repo';
import { formatarPrecoUnidade } from '@/domain/format';
import { mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

export default function Catalogo() {
  const db = useSQLiteContext();
  const [tipo, setTipo] = useState<TipoItem>('ingrediente');
  const [pesquisa, setPesquisa] = useState('');
  const [itens, setItens] = useState<Item[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarItens(db, { tipo }).then(setItens).catch(mostrarErro);
    }, [db, tipo]),
  );

  const filtrados = useMemo(() => {
    const p = pesquisa.trim().toLocaleLowerCase('pt');
    return p ? itens.filter((i) => i.nome.toLocaleLowerCase('pt').includes(p)) : itens;
  }, [itens, pesquisa]);

  return (
    <View style={styles.ecra}>
      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => setTipo(v as TipoItem)}
        style={styles.segmentos}
        buttons={[
          { value: 'ingrediente', label: 'Ingredientes' },
          { value: 'material', label: 'Materiais' },
        ]}
      />
      <Searchbar placeholder="Pesquisar" value={pesquisa} onChangeText={setPesquisa} style={styles.pesquisa} />
      <FlatList
        data={filtrados}
        keyExtractor={(i) => String(i.id)}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {pesquisa
              ? 'Nada encontrado.'
              : tipo === 'ingrediente'
                ? 'Ainda não há ingredientes.\nToque em + para adicionar.'
                : 'Ainda não há materiais (caixas, bases, toppers…).\nToque em + para adicionar.'}
          </Text>
        }
        renderItem={({ item: i }) => (
          <List.Item
            title={i.nome}
            titleStyle={!i.ativo && styles.inativo}
            description={i.ativo ? undefined : 'Inativo'}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(i.id) } })}
            right={() => <Text style={styles.preco}>{formatarPrecoUnidade(i.preco_unidade_cent, i.unidade)}</Text>}
          />
        )}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push({ pathname: '/item/[id]', params: { id: 'novo', tipo } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecra: { flex: 1 },
  segmentos: { marginHorizontal: espaco.m, marginTop: espaco.m },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s },
  lista: { paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, color: tema.colors.onSurfaceVariant },
  inativo: { color: tema.colors.onSurfaceVariant },
  preco: { alignSelf: 'center' },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
