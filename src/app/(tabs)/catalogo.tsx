import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Searchbar, SegmentedButtons, Text } from 'react-native-paper';

import { listarItens, type Item, type TipoItem } from '@/db/repo';
import { formatarPrecoUnidade } from '@/domain/format';
import { textos } from '@/i18n';
import { CartaoLista } from '@/ui/CartaoLista';
import { mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

const ICONE_TIPO: Record<TipoItem, { icone: string; corIcone: string; fundoIcone: string }> = {
  ingrediente: {
    icone: 'egg-outline',
    corIcone: tema.colors.onTertiaryContainer,
    fundoIcone: tema.colors.tertiaryContainer,
  },
  material: {
    icone: 'package-variant-closed',
    corIcone: tema.colors.onSecondaryContainer,
    fundoIcone: tema.colors.secondaryContainer,
  },
};

export default function Catalogo() {
  const db = useSQLiteContext();
  const [tipo, setTipo] = useState<TipoItem>('ingrediente');
  const [pesquisa, setPesquisa] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const t = textos();

  useFocusEffect(
    useCallback(() => {
      listarItens(db, { tipo }).then(setItens).catch(mostrarErro);
    }, [db, tipo]),
  );

  const filtrados = useMemo(() => {
    const p = pesquisa.trim().toLocaleLowerCase(t.locale);
    return p ? itens.filter((i) => i.nome.toLocaleLowerCase(t.locale).includes(p)) : itens;
  }, [itens, pesquisa, t.locale]);

  return (
    <View style={styles.ecra}>
      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => setTipo(v as TipoItem)}
        style={styles.segmentos}
        buttons={[
          { value: 'ingrediente', label: t.catalogo.ingredientes },
          { value: 'material', label: t.catalogo.materiais },
        ]}
      />
      <Searchbar placeholder={t.comum.pesquisar} value={pesquisa} onChangeText={setPesquisa} style={styles.pesquisa} />
      <FlatList
        data={filtrados}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio} variant="bodyLarge">
            {pesquisa
              ? t.comum.nadaEncontrado
              : tipo === 'ingrediente'
                ? t.catalogo.vazioIngredientes
                : t.catalogo.vazioMateriais}
          </Text>
        }
        renderItem={({ item: i }) => (
          <CartaoLista
            titulo={i.nome}
            descricao={i.ativo ? undefined : t.catalogo.inativo}
            esbatido={!i.ativo}
            {...ICONE_TIPO[i.tipo]}
            direita={
              <Text variant="titleSmall" style={styles.preco}>
                {formatarPrecoUnidade(i.preco_unidade_cent, i.unidade)}
              </Text>
            }
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(i.id) } })}
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
  pesquisa: { margin: espaco.m, marginBottom: espaco.s, backgroundColor: tema.colors.surface },
  lista: { paddingTop: espaco.xs, paddingBottom: 96 },
  vazio: { textAlign: 'center', marginTop: espaco.l * 2, color: tema.colors.onSurfaceVariant },
  preco: { fontWeight: 'bold', color: tema.colors.primary },
  fab: { position: 'absolute', right: espaco.m, bottom: espaco.m },
});
