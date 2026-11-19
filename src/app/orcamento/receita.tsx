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
import { formatarEuro, lerDecimal } from '@/domain/format';
import { somaLinhas } from '@/domain/pricing';
import { escalarLinhas, escalaValida } from '@/domain/receitas';
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

  useEffect(() => {
    listarReceitas(db, pesquisa).then(setLista).catch(mostrarErro);
  }, [db, pesquisa]);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: 'Escolher receita' }} />
      <Searchbar placeholder="Pesquisar receita" value={pesquisa} onChangeText={setPesquisa} style={styles.pesquisa} />
      <FlatList
        data={lista.filter((r) => r.n_linhas > 0)}
        keyExtractor={(r) => String(r.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            {pesquisa ? 'Nada encontrado.' : 'Ainda não há receitas com linhas. Crie-as no separador Receitas.'}
          </Text>
        }
        renderItem={({ item: r }) => (
          <List.Item
            title={r.nome || 'Sem nome'}
            description={r.n_linhas === 1 ? '1 linha' : `${r.n_linhas} linhas`}
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

  const escala = lerDecimal(texto);
  const valida = escalaValida(escala);
  const linhas = receita.linhas.map(entradaDeLinhaReceita);
  const custo = somaLinhas(valida ? escalarLinhas(linhas, escala) : linhas);

  async function adicionar() {
    setTentou(true);
    if (!valida) return;
    try {
      await aplicarReceita(db, boloId, receita.id, escala);
      avisar('Receita adicionada ao bolo');
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Adicionar receita' }} />
      <View>
        <Text variant="titleLarge">{receita.nome || 'Sem nome'}</Text>
        <Text variant="bodyMedium" style={styles.secundario}>
          {receita.linhas.map((l) => l.nome).join(', ')}
        </Text>
      </View>

      <View>
        <TextInput
          mode="outlined"
          label="Escala"
          value={texto}
          onChangeText={setTexto}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="×" />}
          error={tentou && !valida}
          onSubmitEditing={adicionar}
        />
        {tentou && !valida ? (
          <HelperText type="error">Indique uma escala maior que zero (ex.: 1,5).</HelperText>
        ) : (
          <HelperText type="info">
            Multiplica as quantidades dos ingredientes (ex.: 1,5 para um bolo 50 % maior). Materiais e linhas
            livres ficam iguais.
          </HelperText>
        )}
      </View>

      <View>
        <Text variant="headlineSmall">= {formatarEuro(custo)}</Text>
        <Text variant="bodySmall" style={styles.secundario}>
          Custo com os preços atuais, sem margem. As linhas juntam-se às que o bolo já tem e podem ser
          editadas depois.
        </Text>
      </View>

      <Button mode="contained" onPress={adicionar}>
        Adicionar ao bolo
      </Button>
      <Button mode="text" onPress={aoVoltar}>
        Escolher outra receita
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
