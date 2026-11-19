import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';

import { apagarItem, atualizarItem, criarItem, itemEmUso, obterItem, type TipoItem } from '@/db/repo';
import { centParaTexto, lerEurosParaCent } from '@/domain/format';
import type { UnidadeItem } from '@/domain/units';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

const NOME_UNIDADE: Record<UnidadeItem, string> = { kg: 'kg', l: 'litro', un: 'unidade' };

export default function EditarItem() {
  const db = useSQLiteContext();
  const { id, tipo: tipoInicial } = useLocalSearchParams<{ id: string; tipo?: TipoItem }>();
  const novo = id === 'novo';

  const [tipo, setTipo] = useState<TipoItem>(tipoInicial ?? 'ingrediente');
  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState<UnidadeItem>(tipoInicial === 'material' ? 'un' : 'kg');
  const [preco, setPreco] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [tentouGuardar, setTentouGuardar] = useState(false);

  useEffect(() => {
    if (novo) return;
    obterItem(db, Number(id))
      .then((i) => {
        if (!i) return;
        setTipo(i.tipo);
        setNome(i.nome);
        setUnidade(i.unidade);
        setPreco(centParaTexto(i.preco_unidade_cent));
        setAtivo(!!i.ativo);
      })
      .catch(mostrarErro);
  }, [db, id, novo]);

  const precoCent = lerEurosParaCent(preco);
  const erroNome = nome.trim() === '' ? 'Indique o nome.' : null;
  const erroPreco = precoCent === null || precoCent < 0 ? 'Indique um preço válido (ex.: 1,20).' : null;

  async function guardar() {
    setTentouGuardar(true);
    if (erroNome || erroPreco) return;
    const dados = { tipo, nome: nome.trim(), unidade, preco_unidade_cent: precoCent!, ativo: ativo ? 1 : 0 };
    try {
      if (novo) await criarItem(db, dados);
      else await atualizarItem(db, Number(id), dados);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function apagar() {
    try {
      const emUso = await itemEmUso(db, Number(id));
      const mensagem = emUso
        ? 'Este item é usado em orçamentos. Os orçamentos mantêm o nome e o preço, mas o item sai do catálogo. Em alternativa, pode desativá-lo.'
        : 'O item sai do catálogo.';
      if (!(await confirmar(`Apagar "${nome}"?`, mensagem))) return;
      await apagarItem(db, Number(id));
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: novo ? 'Novo item' : 'Editar item' }} />

      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => setTipo(v as TipoItem)}
        buttons={[
          { value: 'ingrediente', label: 'Ingrediente' },
          { value: 'material', label: 'Material' },
        ]}
      />

      <View>
        <TextInput
          mode="outlined"
          label="Nome"
          value={nome}
          onChangeText={setNome}
          autoFocus={novo}
          error={tentouGuardar && !!erroNome}
        />
        {tentouGuardar && erroNome ? <HelperText type="error">{erroNome}</HelperText> : null}
      </View>

      <View style={styles.bloco}>
        <Text variant="labelLarge">O preço é por</Text>
        <SegmentedButtons
          value={unidade}
          onValueChange={(v) => setUnidade(v as UnidadeItem)}
          buttons={[
            { value: 'kg', label: 'kg' },
            { value: 'l', label: 'litro' },
            { value: 'un', label: 'unidade' },
          ]}
        />
      </View>

      <View>
        <TextInput
          mode="outlined"
          label={`Preço por ${NOME_UNIDADE[unidade]}`}
          value={preco}
          onChangeText={setPreco}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text={`€/${unidade}`} />}
          error={tentouGuardar && !!erroPreco}
        />
        {tentouGuardar && erroPreco ? (
          <HelperText type="error">{erroPreco}</HelperText>
        ) : (
          <HelperText type="info">
            {unidade === 'un'
              ? 'Ex.: ovos a 0,25 €/unidade, caixa a 1,50 €/unidade.'
              : `Ex.: farinha a 1,20 €/${unidade}. No orçamento pode indicar a quantidade em ${unidade === 'kg' ? 'gramas' : 'ml'}.`}
          </HelperText>
        )}
      </View>

      {!novo ? (
        <View style={styles.linha}>
          <View style={styles.flex}>
            <Text variant="bodyLarge">Ativo</Text>
            <Text variant="bodySmall" style={styles.secundario}>
              Itens inativos não aparecem ao adicionar a um orçamento.
            </Text>
          </View>
          <Switch value={ativo} onValueChange={setAtivo} />
        </View>
      ) : null}

      {!novo ? (
        <Text variant="bodySmall" style={styles.secundario}>
          Mudar o preço não altera os orçamentos já feitos.
        </Text>
      ) : null}

      <Button mode="contained" onPress={guardar} style={styles.botao}>
        Guardar
      </Button>
      {!novo ? (
        <Button mode="text" textColor={tema.colors.error} onPress={apagar}>
          Apagar item
        </Button>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.m },
  bloco: { gap: espaco.s },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  flex: { flex: 1 },
  secundario: { color: tema.colors.onSurfaceVariant },
  botao: { marginTop: espaco.s },
});
