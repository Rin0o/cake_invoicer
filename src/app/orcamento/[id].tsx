import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Text } from 'react-native-paper';

import {
  adicionarBolo,
  apagarOrcamento,
  atualizarOrcamento,
  calcular,
  obterDefinicoes,
  obterOrcamento,
  type OrcamentoCompleto,
} from '@/db/repo';
import {
  formatarData,
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  lerData,
  lerDecimal,
} from '@/domain/format';
import { resumoTexto } from '@/share/texto';
import { BoloCard } from '@/ui/BoloCard';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { espaco, tema } from '@/ui/theme';

function LinhaTotal({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <View style={styles.linhaTotal}>
      <Text variant={forte ? 'titleLarge' : 'bodyLarge'}>{rotulo}</Text>
      <Text variant={forte ? 'titleLarge' : 'bodyLarge'}>{valor}</Text>
    </View>
  );
}

export default function EditarOrcamento() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orcamentoId = Number(id);
  const [o, setO] = useState<OrcamentoCompleto | null>(null);

  const carregar = useCallback(async () => {
    setO(await obterOrcamento(db, orcamentoId));
  }, [db, orcamentoId]);

  useFocusEffect(
    useCallback(() => {
      carregar().catch(mostrarErro);
    }, [carregar]),
  );

  const calc = useMemo(() => (o ? calcular(o) : null), [o]);

  async function guardarCampos(campos: Parameters<typeof atualizarOrcamento>[2]) {
    try {
      await atualizarOrcamento(db, orcamentoId, campos);
      await carregar();
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function partilhar() {
    if (!o || !calc) return;
    try {
      const d = await obterDefinicoes(db);
      await Share.share({
        message: resumoTexto({
          nomeNegocio: d.nome_negocio,
          contactoNegocio: d.contacto,
          cliente: o.cliente,
          dataEntrega: o.data_entrega,
          bolos: o.bolos,
          calculo: calc,
        }),
      });
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function apagar() {
    const nome = o?.cliente ? ` de ${o.cliente}` : '';
    if (!(await confirmar(`Apagar o orçamento${nome}?`, 'Isto não se pode desfazer.'))) return;
    try {
      await apagarOrcamento(db, orcamentoId);
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function novoBolo() {
    try {
      await adicionarBolo(db, orcamentoId);
      await carregar();
    } catch (e) {
      mostrarErro(e);
    }
  }

  if (!o || !calc) {
    return <Stack.Screen options={{ title: 'Orçamento' }} />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Stack.Screen
        options={{
          title: o.cliente || 'Orçamento',
          headerRight: () => (
            <View style={styles.acoes}>
              <IconButton icon="share-variant" onPress={partilhar} accessibilityLabel="Partilhar" />
              <IconButton icon="delete-outline" onPress={apagar} accessibilityLabel="Apagar orçamento" />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.campos}>
            <CampoAutoGuardado
              label="Cliente"
              valor={o.cliente}
              aoGuardar={(t) => guardarCampos({ cliente: t.trim() })}
            />
            <CampoAutoGuardado
              label="Contacto do cliente"
              valor={o.contacto}
              keyboardType="phone-pad"
              aoGuardar={(t) => guardarCampos({ contacto: t.trim() })}
            />
            <CampoAutoGuardado
              label="Data de entrega"
              placeholder="dd/mm/aaaa"
              valor={formatarData(o.data_entrega)}
              keyboardType="numbers-and-punctuation"
              aoGuardar={async (t) => {
                if (t.trim() === '') return guardarCampos({ data_entrega: null });
                const iso = lerData(t);
                if (!iso) return 'Data inválida. Use dd/mm/aaaa.';
                await guardarCampos({ data_entrega: iso });
              }}
            />
            <CampoAutoGuardado
              label="Notas (internas)"
              valor={o.notas}
              multiline
              aoGuardar={(t) => guardarCampos({ notas: t })}
            />
            <CampoAutoGuardado
              label="Margem"
              valor={formatarDecimal(o.margem_pct, 2)}
              keyboardType="decimal-pad"
              ajuda="Só sobre ingredientes e materiais."
              aoGuardar={async (t) => {
                const n = lerDecimal(t);
                if (n === null || n < 0) return 'Margem inválida.';
                await guardarCampos({ margem_pct: n });
              }}
            />
          </Card.Content>
        </Card>

        {o.bolos.map((b, i) => (
          <BoloCard key={b.id} bolo={b} calc={calc.bolos[i]} orcamento={o} aoMudar={carregar} />
        ))}

        <Button mode="outlined" icon="cake-variant" onPress={novoBolo} style={styles.botao}>
          Adicionar bolo
        </Button>

        <Card mode="contained" style={styles.card}>
          <Card.Content>
            {calc.diferencaCent !== 0 ? (
              <>
                <LinhaTotal rotulo="Total calculado" valor={formatarEuroInteiro(calc.totalCalcCent)} />
                <LinhaTotal
                  rotulo="Ajustes"
                  valor={`${calc.diferencaCent > 0 ? '+' : ''}${formatarEuroInteiro(calc.diferencaCent)}`}
                />
              </>
            ) : null}
            <LinhaTotal rotulo="Total" valor={formatarEuroInteiro(calc.totalCent)} forte />
            <Text variant="bodySmall" style={styles.secundario}>
              Custo total: {formatarEuro(calc.custoCent)}
            </Text>
          </Card.Content>
        </Card>

        <Button mode="contained" icon="share-variant" onPress={partilhar} style={styles.botao}>
          Partilhar com o cliente
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingTop: espaco.m, paddingBottom: espaco.l * 3 },
  card: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  campos: { gap: espaco.xs },
  acoes: { flexDirection: 'row' },
  botao: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  linhaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  secundario: { color: tema.colors.onSurfaceVariant, marginTop: espaco.xs },
});
