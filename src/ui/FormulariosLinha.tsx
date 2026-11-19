/**
 * Formulários de linhas, partilhados pelos bolos do orçamento e pelas receitas:
 * escolher um item do catálogo, indicar a quantidade, e linha livre (descrição + valor).
 * Depois de guardar ou remover, voltam ao ecrã anterior.
 */
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, List, Searchbar, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { listarItens, type Item } from '@/db/repo';
import {
  centParaTexto,
  formatarDecimal,
  formatarEuro,
  formatarPrecoUnidade,
  lerDecimal,
  lerEurosParaCent,
} from '@/domain/format';
import { valorLinha } from '@/domain/pricing';
import {
  deUnidadeItem,
  paraUnidadeItem,
  UNIDADES_ENTRADA,
  unidadeEntradaPorOmissao,
  type UnidadeEntrada,
  type UnidadeItem,
} from '@/domain/units';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

async function executarEVoltar(fn: () => Promise<void>, mensagem: string) {
  try {
    await fn();
    avisar(mensagem);
    router.back();
  } catch (e) {
    mostrarErro(e);
  }
}

function BotaoRemover({ nome, aoRemover }: { nome: string; aoRemover: () => Promise<void> }) {
  async function remover() {
    if (!(await confirmar(`Remover "${nome}"?`, 'A linha é removida.', 'Remover'))) return;
    await executarEVoltar(aoRemover, 'Linha removida');
  }
  return (
    <Button mode="text" textColor={tema.colors.error} onPress={remover}>
      Remover linha
    </Button>
  );
}

// ---------- Escolher item do catálogo ----------

export function EscolherItem({ aoEscolher }: { aoEscolher: (item: Item) => void }) {
  const db = useSQLiteContext();
  const [itens, setItens] = useState<Item[]>([]);
  const [pesquisa, setPesquisa] = useState('');

  useEffect(() => {
    listarItens(db, { soAtivos: true }).then(setItens).catch(mostrarErro);
  }, [db]);

  const filtrados = useMemo(() => {
    const p = pesquisa.trim().toLocaleLowerCase('pt');
    return p ? itens.filter((i) => i.nome.toLocaleLowerCase('pt').includes(p)) : itens;
  }, [itens, pesquisa]);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: 'Escolher item' }} />
      <Searchbar
        placeholder="Pesquisar ingrediente ou material"
        value={pesquisa}
        onChangeText={setPesquisa}
        autoFocus
        style={styles.pesquisa}
      />
      <FlatList
        data={filtrados}
        keyExtractor={(i) => String(i.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            {itens.length === 0
              ? 'O catálogo está vazio. Adicione ingredientes e materiais no separador Catálogo.'
              : 'Nada encontrado.'}
          </Text>
        }
        renderItem={({ item: i }) => (
          <List.Item
            title={i.nome}
            description={i.tipo === 'material' ? 'Material' : 'Ingrediente'}
            onPress={() => aoEscolher(i)}
            right={() => <Text style={styles.centro}>{formatarPrecoUnidade(i.preco_unidade_cent, i.unidade)}</Text>}
          />
        )}
      />
    </View>
  );
}

// ---------- Quantidade de um item ----------

interface PropsQuantidade {
  titulo: string;
  nome: string;
  unidade: UnidadeItem;
  precoUnitCent: number;
  /** Texto a seguir ao preço (ex.: "preço no momento em que foi adicionado"). */
  notaPreco?: string;
  /** Linha existente: quantidade na unidade do item e unidade em que foi escrita. */
  inicial?: { quantidade: number; unidadeEntrada: UnidadeEntrada };
  aoGuardar: (quantidadeNaUnidadeDoItem: number, unidadeEntrada: UnidadeEntrada) => Promise<void>;
  aoVoltar?: () => void;
  aoRemover?: () => Promise<void>;
}

export function FormQuantidade(p: PropsQuantidade) {
  const [unidadeEntrada, setUnidadeEntrada] = useState<UnidadeEntrada>(
    p.inicial?.unidadeEntrada ?? unidadeEntradaPorOmissao(p.unidade),
  );
  const [texto, setTexto] = useState(
    p.inicial ? formatarDecimal(deUnidadeItem(p.inicial.quantidade, p.inicial.unidadeEntrada, p.unidade)) : '',
  );
  const [tentou, setTentou] = useState(false);

  const q = lerDecimal(texto);
  const valida = q !== null && q > 0;
  const qItem = valida ? paraUnidadeItem(q, unidadeEntrada, p.unidade) : 0;
  const valor = valorLinha({ quantidade: qItem, precoUnitCent: p.precoUnitCent });
  const opcoes = UNIDADES_ENTRADA[p.unidade];

  function guardar() {
    setTentou(true);
    if (valida) {
      executarEVoltar(() => p.aoGuardar(qItem, unidadeEntrada), p.inicial ? 'Linha guardada' : 'Linha adicionada');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: p.titulo }} />
      <View>
        <Text variant="titleLarge">{p.nome}</Text>
        <Text variant="bodyMedium" style={styles.secundario}>
          {formatarPrecoUnidade(p.precoUnitCent, p.unidade)}
          {p.notaPreco ? ` (${p.notaPreco})` : ''}
        </Text>
      </View>

      {opcoes.length > 1 ? (
        <SegmentedButtons
          value={unidadeEntrada}
          onValueChange={(v) => setUnidadeEntrada(v as UnidadeEntrada)}
          buttons={opcoes.map((u) => ({ value: u, label: u }))}
        />
      ) : null}

      <View>
        <TextInput
          mode="outlined"
          label="Quantidade usada"
          value={texto}
          onChangeText={setTexto}
          keyboardType="decimal-pad"
          autoFocus
          right={<TextInput.Affix text={unidadeEntrada} />}
          error={tentou && !valida}
          onSubmitEditing={guardar}
        />
        {tentou && !valida ? <HelperText type="error">Indique uma quantidade maior que zero.</HelperText> : null}
      </View>

      <Text variant="headlineSmall">= {formatarEuro(valor)}</Text>

      <Button mode="contained" onPress={guardar}>
        {p.inicial ? 'Guardar' : 'Adicionar'}
      </Button>
      {p.aoVoltar ? (
        <Button mode="text" onPress={p.aoVoltar}>
          Escolher outro item
        </Button>
      ) : null}
      {p.aoRemover ? <BotaoRemover nome={p.nome} aoRemover={p.aoRemover} /> : null}
    </ScrollView>
  );
}

// ---------- Linha livre ----------

interface PropsLivre {
  titulo: string;
  inicial?: { descricao: string; valorCent: number };
  aoGuardar: (descricao: string, valorCent: number) => Promise<void>;
  aoRemover?: () => Promise<void>;
}

export function FormLivre(p: PropsLivre) {
  const [descricao, setDescricao] = useState(p.inicial?.descricao ?? '');
  const [valor, setValor] = useState(p.inicial ? centParaTexto(p.inicial.valorCent) : '');
  const [tentou, setTentou] = useState(false);

  const cent = lerEurosParaCent(valor);
  const erroDescricao = descricao.trim() === '' ? 'Indique a descrição.' : null;
  const erroValor = cent === null || cent < 0 ? 'Indique um valor válido (ex.: 3,50).' : null;

  function guardar() {
    setTentou(true);
    if (!erroDescricao && !erroValor) {
      executarEVoltar(() => p.aoGuardar(descricao.trim(), cent!), p.inicial ? 'Linha guardada' : 'Linha adicionada');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: p.titulo }} />
      <Text variant="bodyMedium" style={styles.secundario}>
        Para custos que não estão no catálogo (ex.: impressão de imagem, deslocação).
      </Text>
      <View>
        <TextInput
          mode="outlined"
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          autoFocus={!p.inicial}
          error={tentou && !!erroDescricao}
        />
        {tentou && erroDescricao ? <HelperText type="error">{erroDescricao}</HelperText> : null}
      </View>
      <View>
        <TextInput
          mode="outlined"
          label="Valor"
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="€" />}
          error={tentou && !!erroValor}
        />
        {tentou && erroValor ? <HelperText type="error">{erroValor}</HelperText> : null}
      </View>
      <Text variant="bodySmall" style={styles.secundario}>
        Entra como custo de materiais, por isso leva margem.
      </Text>
      <Button mode="contained" onPress={guardar}>
        {p.inicial ? 'Guardar' : 'Adicionar'}
      </Button>
      {p.aoRemover ? <BotaoRemover nome={descricao || 'linha'} aoRemover={p.aoRemover} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pesquisa: { margin: espaco.m, marginBottom: espaco.s },
  vazio: { textAlign: 'center', margin: espaco.l, color: tema.colors.onSurfaceVariant },
  centro: { alignSelf: 'center' },
  form: { padding: espaco.m, gap: espaco.m },
  secundario: { color: tema.colors.onSurfaceVariant },
});
