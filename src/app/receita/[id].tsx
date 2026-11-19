import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, List, Text } from 'react-native-paper';

import {
  apagarReceita,
  atualizarReceita,
  entradaDeLinhaReceita,
  obterReceita,
  type LinhaReceitaDetalhe,
  type ReceitaCompleta,
} from '@/db/repo';
import { formatarDecimal, formatarEuro, formatarPrecoUnidade } from '@/domain/format';
import { somaLinhas, valorLinha } from '@/domain/pricing';
import { deUnidadeItem } from '@/domain/units';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar, BotaoConcluido, GestorGuardar, TituloComEstado, useGestorGuardar } from '@/ui/Guardar';
import { MenuMais } from '@/ui/MenuMais';
import { espaco, tema } from '@/ui/theme';

function descricaoLinha(l: LinhaReceitaDetalhe) {
  if (l.livre) return 'Linha livre';
  const q = deUnidadeItem(l.quantidade, l.unidade_entrada, l.unidade);
  const partes = [
    `${formatarDecimal(q)} ${l.unidade_entrada} × ${formatarPrecoUnidade(l.preco_unit_cent, l.unidade)}`,
  ];
  if (l.tipo === 'material') partes.push('material');
  if (!l.ativo) partes.push('inativo no catálogo');
  return partes.join(' · ');
}

export default function EditarReceita() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const receitaId = Number(id);
  const [r, setR] = useState<ReceitaCompleta | null>(null);
  const gestor = useGestorGuardar();

  const carregar = useCallback(async () => {
    setR(await obterReceita(db, receitaId));
  }, [db, receitaId]);

  useFocusEffect(
    useCallback(() => {
      carregar().catch(mostrarErro);
    }, [carregar]),
  );

  /** Grava e recarrega; os erros são tratados pelo `CampoAutoGuardado` (via gestor). */
  async function guardar(campos: Parameters<typeof atualizarReceita>[2]) {
    await atualizarReceita(db, receitaId, campos);
    await carregar();
  }

  async function apagar() {
    const nome = r?.nome ? ` "${r.nome}"` : '';
    if (!(await confirmar(`Apagar a receita${nome}?`, 'Os orçamentos onde já foi usada não mudam.'))) return;
    try {
      await apagarReceita(db, receitaId);
      avisar('Receita apagada');
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  if (!r) return <Stack.Screen options={{ title: 'Receita' }} />;

  const custo = somaLinhas(r.linhas.map(entradaDeLinhaReceita));

  return (
    <GestorGuardar.Provider value={gestor}>
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Stack.Screen
        options={{
          headerTitle: () => <TituloComEstado titulo={r.nome || 'Receita'} estado={gestor.estado} />,
          headerRight: () => (
            <View style={styles.acoes}>
              <BotaoConcluido gestor={gestor} mensagem="Receita guardada" />
              <MenuMais
                opcoes={[{ titulo: 'Apagar receita', icone: 'delete-outline', aoEscolher: apagar, destrutiva: true }]}
              />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <CampoAutoGuardado
          label="Nome da receita"
          placeholder="Ex.: Massa de chocolate 20 cm"
          valor={r.nome}
          autoFocus={r.nome === '' && r.linhas.length === 0}
          aoGuardar={(t) => guardar({ nome: t.trim() })}
        />
        <CampoAutoGuardado label="Notas" valor={r.notas} multiline aoGuardar={(t) => guardar({ notas: t })} />

        <Card mode="outlined">
          <Card.Content style={styles.card}>
            <Text variant="titleMedium">Ingredientes e materiais</Text>
            {r.linhas.length === 0 ? (
              <Text style={styles.secundario}>Ainda sem linhas.</Text>
            ) : (
              r.linhas.map((l) => (
                <List.Item
                  key={l.id}
                  title={l.nome}
                  description={descricaoLinha(l)}
                  style={styles.linha}
                  onPress={() => router.push({ pathname: '/receita/linha', params: { linhaId: String(l.id) } })}
                  right={() => (
                    <Text style={styles.valor}>
                      {formatarEuro(valorLinha({ quantidade: l.quantidade, precoUnitCent: l.preco_unit_cent }))}
                    </Text>
                  )}
                />
              ))
            )}
            <View style={styles.botoes}>
              <Button
                mode="contained-tonal"
                icon="plus"
                compact
                onPress={() => router.push({ pathname: '/receita/linha', params: { receitaId: String(r.id) } })}>
                Ingrediente / material
              </Button>
              <Button
                mode="text"
                icon="plus"
                compact
                onPress={() =>
                  router.push({ pathname: '/receita/linha', params: { receitaId: String(r.id), livre: '1' } })
                }>
                Linha livre
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content>
            <View style={styles.total}>
              <Text variant="titleMedium">Custo estimado</Text>
              <Text variant="titleMedium">{formatarEuro(custo)}</Text>
            </View>
            <Text variant="bodySmall" style={styles.secundario}>
              Com os preços atuais do catálogo, sem margem. O tempo de trabalho indica-se no orçamento.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
    </GestorGuardar.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  acoes: { flexDirection: 'row', alignItems: 'center' },
  conteudo: { padding: espaco.m, gap: espaco.m, paddingBottom: espaco.l * 3 },
  card: { gap: espaco.s },
  linha: { paddingHorizontal: 0, paddingVertical: 2 },
  valor: { alignSelf: 'center' },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  total: { flexDirection: 'row', justifyContent: 'space-between' },
  secundario: { color: tema.colors.onSurfaceVariant, marginTop: espaco.xs },
});
