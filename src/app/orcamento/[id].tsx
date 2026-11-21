import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, IconButton, Surface, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  adicionarBolo,
  apagarOrcamento,
  atualizarOrcamento,
  calcular,
  obterDefinicoes,
  obterOrcamento,
  type OrcamentoCompleto,
} from '@/db/repo';
import { avisoMudancaDeGrupo, estadoDepoisDePartilhar, nomeEstado, type EstadoOrcamento } from '@/domain/estados';
import {
  formatarData,
  formatarDataDeInstante,
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  hojeIso,
  lerData,
  lerDecimal,
} from '@/domain/format';
import { formatarNumero } from '@/domain/numero';
import { formatarReferencia } from '@/domain/referencia';
import { textos } from '@/i18n';
import { partilharPdf } from '@/pdf/pdf';
import { resumoTexto } from '@/share/texto';
import { BoloCard } from '@/ui/BoloCard';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import {
  avisar,
  BotaoConcluido,
  GestorGuardar,
  TituloComEstado,
  useColapsavel,
  useGestor,
  useGestorGuardar,
} from '@/ui/Guardar';
import { EscolherContacto, type DadosContacto } from '@/ui/EscolherContacto';
import { escolherData } from '@/ui/escolherData';
import { MenuMais } from '@/ui/MenuMais';
import { useTecladoVisivel } from '@/ui/teclado';
import { BotaoEstado, DialogoEstado, PassosSeguintes } from '@/ui/Estado';
import { espaco, tema } from '@/ui/theme';

type GuardarCampos = (campos: Parameters<typeof atualizarOrcamento>[2]) => Promise<void>;

/** Dados do cliente e margem. Fechado, mostra só cliente, título, número, entrega e contacto. */
function DadosCliente({ o, guardarCampos }: { o: OrcamentoCompleto; guardarCampos: GuardarCampos }) {
  const { aberto, alternar } = useColapsavel(!o.cliente);
  const gestor = useGestor();
  const t = textos();

  function usarContacto({ nome, contacto }: DadosContacto) {
    const campos = { ...(nome ? { cliente: nome } : {}), ...(contacto !== null ? { contacto } : {}) };
    if (Object.keys(campos).length === 0) return;
    if (gestor) gestor.executar(() => guardarCampos(campos));
    else guardarCampos(campos).catch(mostrarErro);
  }

  async function escolherEntrega() {
    Keyboard.dismiss();
    const iso = await escolherData(o.data_entrega);
    if (iso === undefined || iso === o.data_entrega) return;
    if (gestor) gestor.executar(() => guardarCampos({ data_entrega: iso }));
    else guardarCampos({ data_entrega: iso }).catch(mostrarErro);
  }

  if (!aberto) {
    const detalhes = [
      t.orcamento.numeroCurto(formatarNumero(o)),
      t.orcamento.referenciaCurta(formatarReferencia(o)),
      o.data_entrega ? t.orcamentos.entrega(formatarData(o.data_entrega)) : t.orcamento.semDataEntrega,
      o.contacto,
    ].filter(Boolean);
    return (
      <Card mode="outlined" style={styles.card}>
        <TouchableRipple
          onPress={alternar}
          borderless
          style={styles.toque}
          accessibilityLabel={t.orcamento.editarCliente}>
          <View style={styles.clienteFechado}>
            <Avatar.Icon
              size={40}
              icon="account-outline"
              color={tema.colors.onPrimaryContainer}
              style={{ backgroundColor: tema.colors.primaryContainer }}
            />
            <View style={styles.flex}>
              <Text variant="titleMedium" numberOfLines={1} style={!o.cliente && styles.semCliente}>
                {o.cliente || t.comum.semCliente}
              </Text>
              {o.titulo ? (
                <Text variant="bodyMedium" numberOfLines={1}>
                  {o.titulo}
                </Text>
              ) : null}
              <Text variant="bodySmall" numberOfLines={1} style={styles.secundario}>
                {detalhes.join(' · ')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={tema.colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      </Card>
    );
  }

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.campos}>
        <View style={styles.clienteTitulo}>
          <Text variant="titleMedium">{t.orcamento.cliente}</Text>
          <View style={styles.acoes}>
            <Text variant="labelLarge" style={styles.numero}>
              {t.orcamento.numeroCurto(formatarNumero(o))} · {t.orcamento.referenciaCurta(formatarReferencia(o))}
            </Text>
            <IconButton icon="chevron-up" onPress={alternar} accessibilityLabel={t.orcamento.fecharCliente} />
          </View>
        </View>
        <EscolherContacto aoEscolher={usarContacto} />
        <CampoAutoGuardado
          label={t.orcamento.cliente}
          valor={o.cliente}
          aoGuardar={(v) => guardarCampos({ cliente: v.trim() })}
        />
        <CampoAutoGuardado
          label={t.orcamento.contactoCliente}
          valor={o.contacto}
          keyboardType="phone-pad"
          aoGuardar={(v) => guardarCampos({ contacto: v.trim() })}
        />
        <CampoAutoGuardado
          label={t.orcamento.pedido}
          placeholder={t.orcamento.exemploPedido}
          valor={o.titulo}
          ajuda={t.orcamento.ajudaPedido}
          aoGuardar={(v) => guardarCampos({ titulo: v.trim() })}
        />
        <CampoAutoGuardado
          label={t.orcamento.dataEntrega}
          placeholder={t.formato.exemploData}
          valor={formatarData(o.data_entrega)}
          keyboardType="numbers-and-punctuation"
          right={
            <TextInput.Icon
              icon="calendar-month-outline"
              accessibilityLabel={t.orcamento.escolherDataEntrega}
              onPress={escolherEntrega}
            />
          }
          aoGuardar={async (v) => {
            if (v.trim() === '') return guardarCampos({ data_entrega: null });
            const iso = lerData(v);
            if (!iso) return t.orcamento.dataInvalida(t.formato.exemploData);
            await guardarCampos({ data_entrega: iso });
          }}
        />
        <CampoAutoGuardado
          label={t.orcamento.notasInternas}
          valor={o.notas}
          multiline
          aoGuardar={(v) => guardarCampos({ notas: v })}
        />
        <CampoAutoGuardado
          label={t.comum.margem}
          valor={formatarDecimal(o.margem_pct, 2)}
          keyboardType="decimal-pad"
          ajuda={t.orcamento.ajudaMargem}
          aoGuardar={async (v) => {
            const n = lerDecimal(v);
            if (n === null || n < 0) return t.comum.margemInvalida;
            await guardarCampos({ margem_pct: n });
          }}
        />
      </Card.Content>
    </Card>
  );
}

export default function EditarOrcamento() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orcamentoId = Number(id);
  const [o, setO] = useState<OrcamentoCompleto | null>(null);
  const [aGerar, setAGerar] = useState(false);
  const gestor = useGestorGuardar();
  const tecladoVisivel = useTecladoVisivel();
  const [escolherEstado, setEscolherEstado] = useState(false);
  const insets = useSafeAreaInsets();
  const t = textos();

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
  async function guardarCampos(campos: Parameters<GuardarCampos>[0]) {
    await atualizarOrcamento(db, orcamentoId, campos);
    await carregar();
  }

  function mudarEstado(estado: EstadoOrcamento) {
    const anterior = o?.estado;
    gestor.executar(async () => {
      await guardarCampos({ estado });
      const aviso = anterior && avisoMudancaDeGrupo(anterior, estado);
      if (aviso) avisar(aviso);
    });
  }

  /** Partilha com o cliente; um rascunho passa a "enviado". */
  async function partilhar(como: 'pdf' | 'texto') {
    if (!o || !calc) return;
    setAGerar(true);
    try {
      if (como === 'pdf') {
        // Nome, cor e contactos vêm das definições atuais (não do orçamento): ver template.ts.
        const d = await obterDefinicoes(db);
        await partilharPdf(
          {
            nomeNegocio: d.nome_negocio,
            cor: d.pdf_cor,
            contactos: {
              telefone: d.contacto_telefone,
              email: d.contacto_email,
              instagram: d.contacto_instagram,
              facebook: d.contacto_facebook,
              tiktok: d.contacto_tiktok,
              site: d.contacto_site,
            },
            referencia: formatarReferencia(o),
            dataEntrega: o.data_entrega,
            bolos: o.bolos,
            calculo: calc,
            dataEmissao: hojeIso(),
          },
          o.cliente,
        );
      } else {
        const d = await obterDefinicoes(db);
        await Share.share({
          message: resumoTexto({
            nomeNegocio: d.nome_negocio,
            referencia: formatarReferencia(o),
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
    if (!o) return;
    const titulo = t.orcamento.apagarTitulo(formatarNumero(o), o.cliente);
    if (!(await confirmar(titulo, t.comum.naoSePodeDesfazer))) return;
    try {
      await apagarOrcamento(db, orcamentoId);
      avisar(t.orcamento.apagado);
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
    return <Stack.Screen options={{ title: t.ecras.orcamento }} />;
  }

  return (
    <GestorGuardar.Provider value={gestor}>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <Stack.Screen
          options={{
            headerTitle: () => (
              <TituloComEstado titulo={o.cliente || t.comum.orcamentoN(formatarNumero(o))} estado={gestor.estado} />
            ),
            headerRight: () => (
              <View style={styles.acoes}>
                <BotaoConcluido gestor={gestor} mensagem={t.orcamento.guardado} />
                <MenuMais
                  opcoes={[
                    {
                      titulo: t.orcamento.enviarPdf,
                      icone: 'file-pdf-box',
                      aoEscolher: () => partilhar('pdf'),
                      desativada: aGerar,
                    },
                    {
                      titulo: t.orcamento.enviarTexto,
                      icone: 'message-text-outline',
                      aoEscolher: () => partilhar('texto'),
                      desativada: aGerar,
                    },
                    { titulo: t.orcamento.apagarOrcamento, icone: 'delete-outline', aoEscolher: apagar, destrutiva: true },
                  ]}
                />
              </View>
            ),
          }}
        />
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.estados}>
            <BotaoEstado estado={o.estado} onPress={() => setEscolherEstado(true)} />
            {formatarDataDeInstante(o.estado_em) ? (
              <Text variant="bodySmall" style={styles.estadoDesde}>
                {t.estados.desde(formatarDataDeInstante(o.estado_em))}
              </Text>
            ) : null}
            <PassosSeguintes estado={o.estado} aoEscolher={mudarEstado} />
          </View>
          <DialogoEstado
            visivel={escolherEstado}
            estado={o.estado}
            aoEscolher={mudarEstado}
            aoFechar={() => setEscolherEstado(false)}
          />

          <DadosCliente o={o} guardarCampos={guardarCampos} />

          {o.bolos.map((b, i) => (
            <BoloCard
              key={b.id}
              bolo={b}
              calc={calc.bolos[i]}
              orcamento={o}
              aoMudar={carregar}
              inicialAberto={o.bolos.length === 1 || b.linhas.length === 0}
            />
          ))}

          <Button mode="outlined" icon="cake-variant" onPress={novoBolo} style={styles.botao}>
            {t.orcamento.adicionarBolo}
          </Button>

          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={() => partilhar('pdf')}
            loading={aGerar}
            disabled={aGerar}
            style={styles.botao}>
            {t.orcamento.enviarPdfCliente}
          </Button>
          <Button
            mode="outlined"
            icon="message-text-outline"
            onPress={() => partilhar('texto')}
            disabled={aGerar}
            style={styles.botao}>
            {t.orcamento.enviarTexto}
          </Button>
          {o.estado === 'rascunho' ? (
            <Text variant="bodySmall" style={[styles.secundario, styles.nota]}>
              {t.orcamento.notaEnviar(nomeEstado('enviado'))}
            </Text>
          ) : null}
        </ScrollView>
        {tecladoVisivel ? null : (
          <Surface style={[styles.barraTotal, { paddingBottom: espaco.s + insets.bottom }]} elevation={4}>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={styles.totalRotulo}>
                {t.comum.total}
              </Text>
              <Text variant="bodySmall" style={styles.totalSecundario}>
                {t.comum.bolos(o.bolos.length)} · {t.orcamento.custo(formatarEuro(calc.custoCent))}
              </Text>
              {calc.diferencaCent !== 0 ? (
                <Text variant="bodySmall" style={styles.totalSecundario}>
                  {t.orcamento.calculadoAjustes(
                    formatarEuroInteiro(calc.totalCalcCent),
                    `${calc.diferencaCent > 0 ? '+' : ''}${formatarEuroInteiro(calc.diferencaCent)}`,
                  )}
                </Text>
              ) : null}
            </View>
            <Text variant="headlineLarge" style={styles.totalValor}>
              {formatarEuroInteiro(calc.totalCent)}
            </Text>
          </Surface>
        )}
      </KeyboardAvoidingView>
    </GestorGuardar.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingTop: espaco.m, paddingBottom: espaco.l },
  card: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  campos: { gap: espaco.xs },
  acoes: { flexDirection: 'row', alignItems: 'center' },
  botao: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  secundario: { color: tema.colors.onSurfaceVariant, marginTop: espaco.xs },
  numero: { color: tema.colors.onSurfaceVariant },
  semCliente: { fontStyle: 'italic', color: tema.colors.onSurfaceVariant },
  toque: { borderRadius: tema.roundness * 3 },
  clienteFechado: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, padding: espaco.m - 4 },
  clienteTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -espaco.s },
  barraTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    paddingHorizontal: espaco.l,
    paddingTop: espaco.s + 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: tema.colors.primary,
  },
  totalRotulo: { color: tema.colors.onPrimary },
  totalValor: { color: tema.colors.onPrimary, fontWeight: 'bold' },
  totalSecundario: { color: tema.colors.onPrimary, opacity: 0.85 },
  nota: { marginHorizontal: espaco.m, textAlign: 'center' },
  estados: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    paddingHorizontal: espaco.m,
    paddingBottom: espaco.m,
  },
  estadoDesde: { color: tema.colors.onSurfaceVariant },
});
