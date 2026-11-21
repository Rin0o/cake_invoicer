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
import { deUnidadeItem, simboloUnidade } from '@/domain/units';
import { textos } from '@/i18n';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar, BotaoConcluido, GestorGuardar, TituloComEstado, useGestorGuardar } from '@/ui/Guardar';
import { MenuMais } from '@/ui/MenuMais';
import { espaco, tema } from '@/ui/theme';

function descricaoLinha(l: LinhaReceitaDetalhe) {
  const t = textos();
  if (l.livre) return t.comum.linhaLivre;
  const q = deUnidadeItem(l.quantidade, l.unidade_entrada, l.unidade);
  const partes = [
    `${formatarDecimal(q)} ${simboloUnidade(l.unidade_entrada)} × ${formatarPrecoUnidade(l.preco_unit_cent, l.unidade)}`,
  ];
  if (l.tipo === 'material') partes.push(t.receita.material);
  if (!l.ativo) partes.push(t.receita.inativoNoCatalogo);
  return partes.join(' · ');
}

export default function EditarReceita() {
  const db = useSQLiteContext();
  const t = textos();
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
    if (!(await confirmar(t.receita.apagarTitulo(r?.nome ?? ''), t.receita.apagarMensagem))) return;
    try {
      await apagarReceita(db, receitaId);
      avisar(t.receita.apagada);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  if (!r) return <Stack.Screen options={{ title: t.ecras.receita }} />;

  const custo = somaLinhas(r.linhas.map(entradaDeLinhaReceita));

  return (
    <GestorGuardar.Provider value={gestor}>
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Stack.Screen
        options={{
          headerTitle: () => <TituloComEstado titulo={r.nome || t.ecras.receita} estado={gestor.estado} />,
          headerRight: () => (
            <View style={styles.acoes}>
              <BotaoConcluido gestor={gestor} mensagem={t.receita.guardada} />
              <MenuMais
                opcoes={[
                  { titulo: t.receita.apagarReceita, icone: 'delete-outline', aoEscolher: apagar, destrutiva: true },
                ]}
              />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <CampoAutoGuardado
          label={t.receita.nome}
          placeholder={t.receita.exemploNome}
          valor={r.nome}
          autoFocus={r.nome === '' && r.linhas.length === 0}
          aoGuardar={(v) => guardar({ nome: v.trim() })}
        />
        <CampoAutoGuardado label={t.comum.notas} valor={r.notas} multiline aoGuardar={(v) => guardar({ notas: v })} />

        <Card mode="outlined">
          <Card.Content style={styles.card}>
            <Text variant="titleMedium">{t.comum.ingredientesMateriais}</Text>
            {r.linhas.length === 0 ? (
              <Text style={styles.secundario}>{t.receita.semLinhas}</Text>
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
                {t.comum.ingredienteMaterial}
              </Button>
              <Button
                mode="text"
                icon="plus"
                compact
                onPress={() =>
                  router.push({ pathname: '/receita/linha', params: { receitaId: String(r.id), livre: '1' } })
                }>
                {t.comum.linhaLivre}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content>
            <View style={styles.total}>
              <Text variant="titleMedium">{t.receita.custoEstimado}</Text>
              <Text variant="titleMedium">{formatarEuro(custo)}</Text>
            </View>
            <Text variant="bodySmall" style={styles.secundario}>
              {t.receita.notaCusto}
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
