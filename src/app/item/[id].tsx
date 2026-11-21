import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';

import {
  apagarItem,
  atualizarItem,
  criarItem,
  itemEmUso,
  obterItem,
  receitasComItem,
  type TipoItem,
} from '@/db/repo';
import { centParaTexto, formatarPrecoUnidade, lerEurosParaCent } from '@/domain/format';
import { simboloUnidade, type UnidadeItem } from '@/domain/units';
import { textos } from '@/i18n';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar } from '@/ui/Guardar';
import { MenuMais } from '@/ui/MenuMais';
import { espaco, tema } from '@/ui/theme';

export default function EditarItem() {
  const db = useSQLiteContext();
  const t = textos();
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
  const erroNome = nome.trim() === '' ? t.item.indiqueNome : null;
  const erroPreco = precoCent === null || precoCent < 0 ? t.item.precoInvalido(centParaTexto(120)) : null;

  async function guardar() {
    setTentouGuardar(true);
    if (erroNome || erroPreco) return;
    const dados = { tipo, nome: nome.trim(), unidade, preco_unidade_cent: precoCent!, ativo: ativo ? 1 : 0 };
    try {
      if (novo) await criarItem(db, dados);
      else await atualizarItem(db, Number(id), dados);
      avisar(novo ? t.item.adicionado : t.item.guardado);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function apagar() {
    try {
      const receitas = await receitasComItem(db, Number(id));
      if (receitas.length > 0) {
        Alert.alert(t.item.naoEPossivelApagar, t.item.usadoEmReceitas(nome, receitas.join(', ')));
        return;
      }
      const emUso = await itemEmUso(db, Number(id));
      const mensagem = emUso ? t.item.usadoEmOrcamentos : t.item.saiDoCatalogo;
      if (!(await confirmar(t.item.apagarTitulo(nome), mensagem))) return;
      await apagarItem(db, Number(id));
      avisar(t.item.apagado);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: novo ? t.item.novo : t.item.editar,
          headerRight: novo
            ? undefined
            : () => (
                <MenuMais
                  opcoes={[{ titulo: t.item.apagarItem, icone: 'delete-outline', aoEscolher: apagar, destrutiva: true }]}
                />
              ),
        }}
      />

      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => setTipo(v as TipoItem)}
        buttons={[
          { value: 'ingrediente', label: t.comum.ingrediente },
          { value: 'material', label: t.comum.material },
        ]}
      />

      <View>
        <TextInput
          mode="outlined"
          label={t.comum.nome}
          value={nome}
          onChangeText={setNome}
          autoFocus={novo}
          error={tentouGuardar && !!erroNome}
        />
        {tentouGuardar && erroNome ? <HelperText type="error">{erroNome}</HelperText> : null}
      </View>

      <View style={styles.bloco}>
        <Text variant="labelLarge">{t.item.precoPor}</Text>
        <SegmentedButtons
          value={unidade}
          onValueChange={(v) => setUnidade(v as UnidadeItem)}
          buttons={(['kg', 'l', 'un'] as const).map((u) => ({ value: u, label: t.unidades.nome[u] }))}
        />
      </View>

      <View>
        <TextInput
          mode="outlined"
          label={t.item.precoPorUnidade(t.unidades.nome[unidade])}
          value={preco}
          onChangeText={setPreco}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text={`€/${simboloUnidade(unidade)}`} />}
          error={tentouGuardar && !!erroPreco}
        />
        {tentouGuardar && erroPreco ? (
          <HelperText type="error">{erroPreco}</HelperText>
        ) : (
          <HelperText type="info">
            {unidade === 'un'
              ? t.item.exemploUnidade(formatarPrecoUnidade(25, 'un'), formatarPrecoUnidade(150, 'un'))
              : t.item.exemploPeso(formatarPrecoUnidade(120, unidade), t.unidades.pequena[unidade])}
          </HelperText>
        )}
      </View>

      {!novo ? (
        <View style={styles.linha}>
          <View style={styles.flex}>
            <Text variant="bodyLarge">{t.item.ativo}</Text>
            <Text variant="bodySmall" style={styles.secundario}>
              {t.item.ajudaAtivo}
            </Text>
          </View>
          <Switch value={ativo} onValueChange={setAtivo} />
        </View>
      ) : null}

      {!novo ? (
        <Text variant="bodySmall" style={styles.secundario}>
          {t.item.notaPreco}
        </Text>
      ) : null}

      <Button mode="contained" icon="check" onPress={guardar} style={styles.botao}>
        {t.comum.guardar}
      </Button>
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
