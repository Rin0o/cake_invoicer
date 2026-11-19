/**
 * Adicionar ou editar uma linha de um bolo.
 *
 * Parâmetros:
 * - `boloId`            → nova linha de item (escolher do catálogo)
 * - `boloId` + `livre`  → nova linha livre (descrição + valor)
 * - `linhaId`           → editar linha existente
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, List, Searchbar, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import {
  adicionarLinhaItem,
  adicionarLinhaLivre,
  apagarLinha,
  atualizarLinha,
  listarItens,
  obterLinha,
  type Item,
  type Linha,
} from '@/db/repo';
import {
  centParaTexto,
  formatarDecimal,
  formatarEuro,
  formatarPrecoUnidade,
  lerDecimal,
  lerEurosParaCent,
} from '@/domain/format';
import {
  deUnidadeItem,
  paraUnidadeItem,
  UNIDADES_ENTRADA,
  unidadeEntradaPorOmissao,
  type UnidadeEntrada,
  type UnidadeItem,
} from '@/domain/units';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

interface Escolhido {
  nome: string;
  unidade: UnidadeItem;
  precoUnitCent: number;
}

export default function EditarLinha() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ boloId?: string; linhaId?: string; livre?: string }>();
  const linhaId = params.linhaId ? Number(params.linhaId) : null;

  const [linha, setLinha] = useState<Linha | null>(null);
  const [carregado, setCarregado] = useState(linhaId === null);

  useEffect(() => {
    if (linhaId === null) return;
    obterLinha(db, linhaId)
      .then((l) => {
        setLinha(l);
        setCarregado(true);
      })
      .catch(mostrarErro);
  }, [db, linhaId]);

  if (!carregado) return <Stack.Screen options={{ title: 'Linha' }} />;

  if (linha) {
    return linha.livre ? <FormLivre linha={linha} /> : <FormQuantidade linha={linha} />;
  }
  const boloId = Number(params.boloId);
  if (params.livre) return <FormLivre boloId={boloId} />;
  return <EscolherItem boloId={boloId} />;
}

// ---------- Escolher item do catálogo ----------

function EscolherItem({ boloId }: { boloId: number }) {
  const db = useSQLiteContext();
  const [itens, setItens] = useState<Item[]>([]);
  const [pesquisa, setPesquisa] = useState('');
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    listarItens(db, { soAtivos: true }).then(setItens).catch(mostrarErro);
  }, [db]);

  const filtrados = useMemo(() => {
    const p = pesquisa.trim().toLocaleLowerCase('pt');
    return p ? itens.filter((i) => i.nome.toLocaleLowerCase('pt').includes(p)) : itens;
  }, [itens, pesquisa]);

  if (item) return <FormQuantidade boloId={boloId} item={item} aoVoltar={() => setItem(null)} />;

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
            onPress={() => setItem(i)}
            right={() => <Text style={styles.centro}>{formatarPrecoUnidade(i.preco_unidade_cent, i.unidade)}</Text>}
          />
        )}
      />
    </View>
  );
}

// ---------- Quantidade de um item ----------

type PropsQuantidade =
  | { linha: Linha; boloId?: undefined; item?: undefined; aoVoltar?: undefined }
  | { linha?: undefined; boloId: number; item: Item; aoVoltar: () => void };

function FormQuantidade(props: PropsQuantidade) {
  const db = useSQLiteContext();
  const { linha, item } = props;

  // Numa linha existente usa-se o nome e o preço copiados quando foi adicionada.
  const escolhido: Escolhido = linha
    ? { nome: linha.descricao, unidade: linha.unidade, precoUnitCent: linha.preco_unit_cent }
    : { nome: item!.nome, unidade: item!.unidade, precoUnitCent: item!.preco_unidade_cent };

  const [unidadeEntrada, setUnidadeEntrada] = useState<UnidadeEntrada>(
    linha ? linha.unidade_entrada : unidadeEntradaPorOmissao(escolhido.unidade),
  );
  const [texto, setTexto] = useState(
    linha ? formatarDecimal(deUnidadeItem(linha.quantidade, linha.unidade_entrada, linha.unidade)) : '',
  );
  const [tentou, setTentou] = useState(false);

  const q = lerDecimal(texto);
  const valida = q !== null && q > 0;
  const qItem = valida ? paraUnidadeItem(q, unidadeEntrada, escolhido.unidade) : 0;
  const valor = qItem * escolhido.precoUnitCent;
  const opcoes = UNIDADES_ENTRADA[escolhido.unidade];

  async function guardar() {
    setTentou(true);
    if (!valida) return;
    try {
      if (linha) await atualizarLinha(db, linha.id, { quantidade: qItem, unidade_entrada: unidadeEntrada });
      else await adicionarLinhaItem(db, props.boloId!, item!, qItem, unidadeEntrada);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: linha ? 'Editar quantidade' : 'Quantidade usada' }} />
      <View>
        <Text variant="titleLarge">{escolhido.nome}</Text>
        <Text variant="bodyMedium" style={styles.secundario}>
          {formatarPrecoUnidade(escolhido.precoUnitCent, escolhido.unidade)}
          {linha ? ' (preço no momento em que foi adicionado)' : ''}
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
        {linha ? 'Guardar' : 'Adicionar'}
      </Button>
      {props.aoVoltar ? (
        <Button mode="text" onPress={props.aoVoltar}>
          Escolher outro item
        </Button>
      ) : null}
      {linha ? <BotaoApagar linha={linha} /> : null}
    </ScrollView>
  );
}

// ---------- Linha livre ----------

function FormLivre({ linha, boloId }: { linha?: Linha; boloId?: number }) {
  const db = useSQLiteContext();
  const [descricao, setDescricao] = useState(linha?.descricao ?? '');
  const [valor, setValor] = useState(linha ? centParaTexto(linha.preco_unit_cent) : '');
  const [tentou, setTentou] = useState(false);

  const cent = lerEurosParaCent(valor);
  const erroDescricao = descricao.trim() === '' ? 'Indique a descrição.' : null;
  const erroValor = cent === null || cent < 0 ? 'Indique um valor válido (ex.: 3,50).' : null;

  async function guardar() {
    setTentou(true);
    if (erroDescricao || erroValor) return;
    try {
      if (linha) await atualizarLinha(db, linha.id, { descricao: descricao.trim(), preco_unit_cent: cent! });
      else await adicionarLinhaLivre(db, boloId!, descricao.trim(), cent!);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: linha ? 'Editar linha livre' : 'Linha livre' }} />
      <Text variant="bodyMedium" style={styles.secundario}>
        Para custos que não estão no catálogo (ex.: impressão de imagem, deslocação).
      </Text>
      <View>
        <TextInput
          mode="outlined"
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          autoFocus={!linha}
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
        {linha ? 'Guardar' : 'Adicionar'}
      </Button>
      {linha ? <BotaoApagar linha={linha} /> : null}
    </ScrollView>
  );
}

function BotaoApagar({ linha }: { linha: Linha }) {
  const db = useSQLiteContext();
  async function apagar() {
    if (!(await confirmar(`Remover "${linha.descricao}"?`, 'A linha sai deste bolo.', 'Remover'))) return;
    try {
      await apagarLinha(db, linha.id);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }
  return (
    <Button mode="text" textColor={tema.colors.error} onPress={apagar}>
      Remover linha
    </Button>
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
