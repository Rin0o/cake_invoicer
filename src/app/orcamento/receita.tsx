/**
 * Adicionar uma receita a um bolo do orçamento (parâmetro `boloId`).
 * As linhas são copiadas com os preços atuais e a escala aplicada aos ingredientes.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, List, Searchbar, Text, TextInput } from 'react-native-paper';

import {
  aplicarReceita,
  entradaDeLinhaReceita,
  listarReceitas,
  obterReceita,
  type ReceitaCompleta,
  type ResumoReceita,
} from '@/db/repo';
import { formatarDecimal, formatarEuro, formatarPercentagem, lerDecimal } from '@/domain/format';
import { somaLinhas } from '@/domain/pricing';
import { escalarLinhas, escalaValida } from '@/domain/receitas';
import { textos } from '@/i18n';
import { mostrarErro } from '@/ui/confirmar';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

export default function AdicionarReceita() {
  const db = useSQLiteContext();
  const { boloId } = useLocalSearchParams<{ boloId: string }>();
  const [receita, setReceita] = useState<ReceitaCompleta | null>(null);

  async function escolher(id: number) {
    try {
      setReceita(await obterReceita(db, id));
    } catch (e) {
      mostrarErro(e);
    }
  }

  if (receita) return <FormEscala receita={receita} boloId={Number(boloId)} aoVoltar={() => setReceita(null)} />;
  return <EscolherReceita aoEscolher={escolher} />;
}

function EscolherReceita({ aoEscolher }: { aoEscolher: (id: number) => void }) {
  const db = useSQLiteContext();
  const [pesquisa, setPesquisa] = useState('');
  const [lista, setLista] = useState<ResumoReceita[]>([]);
  const t = textos();

  useEffect(() => {
    listarReceitas(db, pesquisa).then(setLista).catch(mostrarErro);
  }, [db, pesquisa]);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: t.receita.escolher }} />
      <Searchbar placeholder={t.receitas.pesquisar} value={pesquisa} onChangeText={setPesquisa} style={styles.pesquisa} />
      <FlatList
        data={lista.filter((r) => r.n_linhas > 0)}
        keyExtractor={(r) => String(r.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            {pesquisa ? t.comum.nadaEncontrado : t.receita.semReceitas}
          </Text>
        }
        renderItem={({ item: r }) => (
          <List.Item
            title={r.nome || t.comum.semNome}
            description={t.comum.linhas(r.n_linhas)}
            onPress={() => aoEscolher(r.id)}
          />
        )}
      />
    </View>
  );
}

function FormEscala({ receita, boloId, aoVoltar }: { receita: ReceitaCompleta; boloId: number; aoVoltar: () => void }) {
  const db = useSQLiteContext();
  const [texto, setTexto] = useState('1');
  const [tentou, setTentou] = useState(false);
  const t = textos();

  const escala = lerDecimal(texto);
  const valida = escalaValida(escala);
  const linhas = receita.linhas.map(entradaDeLinhaReceita);
  const custo = somaLinhas(valida ? escalarLinhas(linhas, escala) : linhas);

  async function adicionar() {
    setTentou(true);
    if (!valida) return;
    try {
      await aplicarReceita(db, boloId, receita.id, escala);
      avisar(t.receita.adicionada);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.ecras.adicionarReceita }} />
      <View>
        <Text variant="titleLarge">{receita.nome || t.comum.semNome}</Text>
        <Text variant="bodyMedium" style={styles.secundario}>
          {receita.linhas.map((l) => l.nome).join(', ')}
        </Text>
      </View>

      <View>
        <TextInput
          mode="outlined"
          label={t.receita.escala}
          value={texto}
          onChangeText={setTexto}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="×" />}
          error={tentou && !valida}
          onSubmitEditing={adicionar}
        />
        {tentou && !valida ? (
          <HelperText type="error">{t.receita.escalaInvalida(formatarDecimal(1.5))}</HelperText>
        ) : (
          <HelperText type="info">{t.receita.ajudaEscala(formatarDecimal(1.5), formatarPercentagem(50))}</HelperText>
        )}
      </View>

      <View>
        <Text variant="headlineSmall">= {formatarEuro(custo)}</Text>
        <Text variant="bodySmall" style={styles.secundario}>
          {t.receita.notaCustoEscala}
        </Text>
      </View>

      <Button mode="contained" onPress={adicionar}>
        {t.receita.adicionarAoBolo}
      </Button>
      <Button mode="text" onPress={aoVoltar}>
        {t.receita.escolherOutra}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s },
  vazio: { textAlign: 'center', margin: espaco.l, color: tema.colors.onSurfaceVariant },
  form: { padding: espaco.m, gap: espaco.m },
  secundario: { color: tema.colors.onSurfaceVariant },
});
