import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';

import {
  adicionarBolo,
  apagarOrcamento,
  atualizarOrcamento,
  calcular,
  obterDefinicoes,
  obterOrcamento,
  type OrcamentoCompleto,
} from '@/db/repo';
import { ESTADOS, estadoDepoisDePartilhar, NOME_ESTADO } from '@/domain/estados';
import {
  formatarData,
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  hojeIso,
  lerData,
  lerDecimal,
} from '@/domain/format';
import { partilharPdf } from '@/pdf/pdf';
import { resumoTexto } from '@/share/texto';
import { BoloCard } from '@/ui/BoloCard';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar, BotaoConcluido, GestorGuardar, TituloComEstado, useGestorGuardar } from '@/ui/Guardar';
import { MenuMais } from '@/ui/MenuMais';
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
  const [aGerar, setAGerar] = useState(false);
  const gestor = useGestorGuardar();

  const carregar = useCallback(async () => {
    setO(await obterOrcamento(db, orcamentoId));
  }, [db, orcamentoId]);

  useFocusEffect(
    useCallback(() => {
      carregar().catch(mostrarErro);
    }, [carregar]),
  );

  const calc = useMemo(() => (o ? calcular(o) : null), [o]);

  /** Grava e recarrega. Os erros são tratados por quem chama (o gestor ou `partilhar`). */
  async function guardarCampos(campos: Parameters<typeof atualizarOrcamento>[2]) {
    await atualizarOrcamento(db, orcamentoId, campos);
    await carregar();
  }

  /** Partilha com o cliente; um rascunho passa a "enviado". */
  async function partilhar(como: 'pdf' | 'texto') {
    if (!o || !calc) return;
    setAGerar(true);
    try {
      if (como === 'pdf') {
        await partilharPdf(
          { dataEntrega: o.data_entrega, bolos: o.bolos, calculo: calc, dataEmissao: hojeIso() },
          o.cliente,
        );
      } else {
        const d = await obterDefinicoes(db);
        await Share.share({
          message: resumoTexto({
            nomeNegocio: d.nome_negocio,
            dataEntrega: o.data_entrega,
            bolos: o.bolos,
            calculo: calc,
          }),
        });
      }
      const novo = estadoDepoisDePartilhar(o.estado);
      if (novo !== o.estado) await gestor.executar(() => guardarCampos({ estado: novo }));
    } catch (e) {
      mostrarErro(e);
    } finally {
      setAGerar(false);
    }
  }

  async function apagar() {
    const nome = o?.cliente ? ` de ${o.cliente}` : '';
    if (!(await confirmar(`Apagar o orçamento${nome}?`, 'Isto não se pode desfazer.'))) return;
    try {
      await apagarOrcamento(db, orcamentoId);
      avisar('Orçamento apagado');
      router.back();
    } catch (e) {
      mostrarErro(e);
    }
  }

  function novoBolo() {
    gestor.executar(async () => {
      await adicionarBolo(db, orcamentoId);
      await carregar();
    });
  }

  if (!o || !calc) {
    return <Stack.Screen options={{ title: 'Orçamento' }} />;
  }

  return (
    <GestorGuardar.Provider value={gestor}>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <Stack.Screen
          options={{
            headerTitle: () => <TituloComEstado titulo={o.cliente || 'Orçamento'} estado={gestor.estado} />,
            headerRight: () => (
              <View style={styles.acoes}>
                <BotaoConcluido gestor={gestor} mensagem="Orçamento guardado" />
                <MenuMais
                  opcoes={[
                    { titulo: 'Enviar PDF', icone: 'file-pdf-box', aoEscolher: () => partilhar('pdf'), desativada: aGerar },
                    {
                      titulo: 'Enviar em texto',
                      icone: 'message-text-outline',
                      aoEscolher: () => partilhar('texto'),
                      desativada: aGerar,
                    },
                    { titulo: 'Apagar orçamento', icone: 'delete-outline', aoEscolher: apagar, destrutiva: true },
                  ]}
                />
              </View>
            ),
          }}
        />
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.estados}>
            {ESTADOS.map((e) => (
              <Chip
                key={e}
                selected={o.estado === e}
                showSelectedOverlay
                onPress={() => (o.estado === e ? undefined : gestor.executar(() => guardarCampos({ estado: e })))}
                accessibilityLabel={`Estado: ${NOME_ESTADO[e]}`}>
                {NOME_ESTADO[e]}
              </Chip>
            ))}
          </ScrollView>

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

          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={() => partilhar('pdf')}
            loading={aGerar}
            disabled={aGerar}
            style={styles.botao}>
            Enviar PDF ao cliente
          </Button>
          <Button
            mode="outlined"
            icon="message-text-outline"
            onPress={() => partilhar('texto')}
            disabled={aGerar}
            style={styles.botao}>
            Enviar em texto
          </Button>
          {o.estado === 'rascunho' ? (
            <Text variant="bodySmall" style={[styles.secundario, styles.nota]}>
              Ao enviar, o orçamento passa a «Enviado».
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </GestorGuardar.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingTop: espaco.m, paddingBottom: espaco.l * 3 },
  card: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  campos: { gap: espaco.xs },
  acoes: { flexDirection: 'row', alignItems: 'center' },
  botao: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  linhaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  secundario: { color: tema.colors.onSurfaceVariant, marginTop: espaco.xs },
  nota: { marginHorizontal: espaco.m, textAlign: 'center' },
  estados: { gap: espaco.s, paddingHorizontal: espaco.m, paddingBottom: espaco.m },
});
