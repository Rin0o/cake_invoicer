import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Divider, IconButton, List, Text, TextInput, TouchableRipple } from 'react-native-paper';

import {
  apagarBolo,
  atualizarBolo,
  definirPrecoFinal,
  type BoloComLinhas,
  type Linha,
  type Orcamento,
} from '@/db/repo';
import {
  formatarDecimal,
  formatarEuro,
  formatarEuroInteiro,
  formatarPercentagem,
  formatarPrecoUnidade,
  formatarTempo,
  lerDecimal,
  lerTempo,
} from '@/domain/format';
import { valorLinha, type BoloCalculado } from '@/domain/pricing';
import { deUnidadeItem, simboloUnidade } from '@/domain/units';
import { textos } from '@/i18n';
import { CampoAutoGuardado } from '@/ui/CampoAutoGuardado';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { useColapsavel, useGestor } from '@/ui/Guardar';
import { MenuMais } from '@/ui/MenuMais';
import { espaco, tema } from '@/ui/theme';

interface Props {
  bolo: BoloComLinhas;
  calc: BoloCalculado;
  orcamento: Orcamento;
  /** Chamado depois de qualquer alteração guardada, para recarregar o orçamento. */
  aoMudar: () => Promise<void>;
  /** Se o cartão começa aberto (com todos os campos) ou fechado (só nome e preço). */
  inicialAberto?: boolean;
}

function descricaoLinha(l: Linha) {
  if (l.livre) return textos().comum.linhaLivre;
  const q = deUnidadeItem(l.quantidade, l.unidade_entrada, l.unidade);
  return `${formatarDecimal(q)} ${simboloUnidade(l.unidade_entrada)} × ${formatarPrecoUnidade(l.preco_unit_cent, l.unidade)}`;
}

/** Diferença com sinal: "+5 €", "−3 €". */
function comSinal(cent: number) {
  return `${cent > 0 ? '+' : ''}${formatarEuroInteiro(cent)}`;
}

function LinhaResumo({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <View style={styles.resumoLinha}>
      <Text variant={forte ? 'titleSmall' : 'bodyMedium'} style={!forte && styles.secundario}>
        {rotulo}
      </Text>
      <Text variant={forte ? 'titleSmall' : 'bodyMedium'}>{valor}</Text>
    </View>
  );
}

export function BoloCard({ bolo, calc, orcamento, aoMudar, inicialAberto = true }: Props) {
  const db = useSQLiteContext();
  const gestor = useGestor();
  const { aberto, alternar } = useColapsavel(inicialAberto);
  const t = textos();

  /** Grava e recarrega; usado pelos campos (o `CampoAutoGuardado` trata dos erros). */
  async function mudar(fn: () => Promise<void>) {
    await fn();
    await aoMudar();
  }

  /** Para botões: grava através do gestor, que mostra o estado e os erros. */
  async function executar(fn: () => Promise<void>) {
    if (gestor) {
      await gestor.executar(() => mudar(fn));
      return;
    }
    try {
      await mudar(fn);
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function apagar() {
    if (await confirmar(t.item.apagarTitulo(bolo.nome), t.bolo.apagarMensagem)) {
      await executar(() => apagarBolo(db, bolo.id));
    }
  }

  const horas = formatarDecimal(bolo.tempo_min / 60, 2);
  const menu = (
    <MenuMais
      descricao={t.bolo.maisOpcoes}
      opcoes={[{ titulo: t.bolo.apagarBolo, icone: 'delete-outline', aoEscolher: apagar, destrutiva: true }]}
    />
  );

  if (!aberto) {
    return (
      <Card mode="outlined" style={styles.card}>
        <TouchableRipple onPress={alternar} borderless style={styles.toque} accessibilityLabel={t.bolo.abrir(bolo.nome)}>
          <View style={styles.fechado}>
            <MaterialCommunityIcons name="chevron-down" size={24} color={tema.colors.onSurfaceVariant} />
            <View style={styles.flex}>
              <Text variant="titleMedium" numberOfLines={1}>
                {bolo.nome}
              </Text>
              <Text variant="bodySmall" style={styles.secundario}>
                {t.comum.linhas(bolo.linhas.length)}
                {calc.ajustado ? ` · ${t.bolo.precoAjustado}` : ''}
              </Text>
            </View>
            {calc.abaixoDoCusto ? (
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={tema.colors.error}
                accessibilityLabel={t.bolo.abaixoDoCustoCurto}
              />
            ) : null}
            <Text variant="titleMedium" style={styles.precoFechado}>
              {formatarEuroInteiro(calc.precoFinalCent)}
            </Text>
            {menu}
          </View>
        </TouchableRipple>
      </Card>
    );
  }

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <IconButton
            icon="chevron-up"
            onPress={alternar}
            accessibilityLabel={t.bolo.fechar(bolo.nome)}
            style={styles.botaoFechar}
          />
          <CampoAutoGuardado
            style={styles.flex}
            label={t.bolo.nome}
            valor={bolo.nome}
            aoGuardar={async (v) => {
              if (!v.trim()) return t.bolo.indiqueNome;
              await mudar(() => atualizarBolo(db, bolo.id, { nome: v.trim() }));
            }}
          />
          {menu}
        </View>

        {bolo.linhas.length === 0 ? (
          <Text style={styles.secundario}>{t.bolo.semIngredientes}</Text>
        ) : (
          <View>
            {bolo.linhas.map((l) => (
              <List.Item
                key={l.id}
                title={l.descricao}
                description={descricaoLinha(l)}
                style={styles.linha}
                onPress={() => router.push({ pathname: '/orcamento/linha', params: { linhaId: String(l.id) } })}
                right={() => <Text style={styles.valorLinha}>{formatarEuro(valorLinha({ quantidade: l.quantidade, precoUnitCent: l.preco_unit_cent }))}</Text>}
              />
            ))}
          </View>
        )}

        <View style={styles.botoes}>
          <Button
            mode="contained-tonal"
            icon="plus"
            compact
            onPress={() => router.push({ pathname: '/orcamento/linha', params: { boloId: String(bolo.id) } })}>
            {t.comum.ingredienteMaterial}
          </Button>
          <Button
            mode="contained-tonal"
            icon="book-open-variant"
            compact
            onPress={() => router.push({ pathname: '/orcamento/receita', params: { boloId: String(bolo.id) } })}>
            {t.bolo.receita}
          </Button>
          <Button
            mode="text"
            icon="plus"
            compact
            onPress={() =>
              router.push({ pathname: '/orcamento/linha', params: { boloId: String(bolo.id), livre: '1' } })
            }>
            {t.comum.linhaLivre}
          </Button>
        </View>

        <CampoAutoGuardado
          label={t.bolo.tempoTrabalho}
          valor={bolo.tempo_min ? formatarTempo(bolo.tempo_min) : ''}
          ajuda={t.bolo.ajudaTempo}
          aoGuardar={async (v) => {
            const min = v.trim() === '' ? 0 : lerTempo(v);
            if (min === null) return t.bolo.tempoInvalido;
            await mudar(() => atualizarBolo(db, bolo.id, { tempo_min: min }));
          }}
        />

        <Divider />

        <View>
          <LinhaResumo rotulo={t.comum.ingredientesMateriais} valor={formatarEuro(calc.materiaisCent)} />
          <LinhaResumo
            rotulo={t.bolo.tempo(horas, formatarEuro(orcamento.valor_hora_cent))}
            valor={formatarEuro(calc.tempoCent)}
          />
          <LinhaResumo
            rotulo={t.bolo.indiretos(formatarPercentagem(orcamento.indireto_pct))}
            valor={formatarEuro(calc.indiretosCent)}
          />
          <LinhaResumo rotulo={t.bolo.custo} valor={formatarEuro(calc.custoCent)} forte />
          <LinhaResumo
            rotulo={t.bolo.margem(formatarPercentagem(orcamento.margem_pct))}
            valor={formatarEuro(calc.margemCent)}
          />
          <LinhaResumo rotulo={t.bolo.precoCalculado} valor={formatarEuroInteiro(calc.precoCalcCent)} forte />
        </View>

        <CampoAutoGuardado
          label={t.bolo.precoFinal}
          valor={String(calc.precoFinalCent / 100)}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="€" />}
          aoGuardar={async (v) => {
            const n = lerDecimal(v);
            if (n === null || n < 0) return t.bolo.valorInvalido;
            const cent = Math.round(n) * 100;
            await mudar(() =>
              definirPrecoFinal(db, bolo.id, cent === calc.precoCalcCent ? null : cent, calc.precoCalcCent),
            );
          }}
        />

        {calc.ajustado ? (
          <View style={styles.ajuste}>
            <Text variant="bodyMedium" style={styles.flex}>
              {t.bolo.ajustado(comSinal(calc.diferencaCent))}
            </Text>
            <Button
              mode="outlined"
              compact
              icon="restore"
              onPress={() => executar(() => definirPrecoFinal(db, bolo.id, null, calc.precoCalcCent))}>
              {t.bolo.reporCalculado}
            </Button>
          </View>
        ) : null}
        {calc.calculadoMudou ? (
          <Text variant="bodySmall" style={styles.aviso}>
            {t.bolo.calculadoMudou(
              formatarEuroInteiro(bolo.preco_calc_no_ajuste_cent ?? 0),
              formatarEuroInteiro(calc.precoCalcCent),
            )}
          </Text>
        ) : null}
        {calc.abaixoDoCusto ? (
          <Text variant="bodySmall" style={styles.erro}>
            {t.bolo.abaixoDoCusto(formatarEuro(calc.custoCent))}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: espaco.m, marginBottom: espaco.m },
  conteudo: { gap: espaco.s },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start' },
  botaoFechar: { marginLeft: -espaco.s, marginRight: 0 },
  toque: { borderRadius: tema.roundness * 3 },
  fechado: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, paddingLeft: espaco.m, paddingVertical: espaco.xs },
  precoFechado: { fontWeight: 'bold', color: tema.colors.primary },
  flex: { flex: 1 },
  linha: { paddingHorizontal: 0, paddingVertical: 2 },
  valorLinha: { alignSelf: 'center' },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, gap: espaco.s },
  secundario: { color: tema.colors.onSurfaceVariant, flexShrink: 1 },
  ajuste: { flexDirection: 'row', alignItems: 'center', gap: espaco.s },
  aviso: { color: tema.colors.secondary },
  erro: { color: tema.colors.error },
});
