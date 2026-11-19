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
  formatarPrecoUnidade,
  formatarTempo,
  lerDecimal,
  lerTempo,
} from '@/domain/format';
import { valorLinha, type BoloCalculado } from '@/domain/pricing';
import { deUnidadeItem } from '@/domain/units';
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
  if (l.livre) return 'Linha livre';
  const q = deUnidadeItem(l.quantidade, l.unidade_entrada, l.unidade);
  return `${formatarDecimal(q)} ${l.unidade_entrada} × ${formatarPrecoUnidade(l.preco_unit_cent, l.unidade)}`;
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
    if (await confirmar(`Apagar "${bolo.nome}"?`, 'O bolo e todas as suas linhas saem do orçamento.')) {
      await executar(() => apagarBolo(db, bolo.id));
    }
  }

  const horas = formatarDecimal(bolo.tempo_min / 60, 2);
  const menu = (
    <MenuMais
      descricao="Mais opções do bolo"
      opcoes={[{ titulo: 'Apagar bolo', icone: 'delete-outline', aoEscolher: apagar, destrutiva: true }]}
    />
  );

  if (!aberto) {
    return (
      <Card mode="outlined" style={styles.card}>
        <TouchableRipple onPress={alternar} borderless style={styles.toque} accessibilityLabel={`Abrir ${bolo.nome}`}>
          <View style={styles.fechado}>
            <MaterialCommunityIcons name="chevron-down" size={24} color={tema.colors.onSurfaceVariant} />
            <View style={styles.flex}>
              <Text variant="titleMedium" numberOfLines={1}>
                {bolo.nome}
              </Text>
              <Text variant="bodySmall" style={styles.secundario}>
                {bolo.linhas.length === 1 ? '1 linha' : `${bolo.linhas.length} linhas`}
                {calc.ajustado ? ' · preço ajustado' : ''}
              </Text>
            </View>
            {calc.abaixoDoCusto ? (
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={tema.colors.error}
                accessibilityLabel="Preço abaixo do custo"
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
            accessibilityLabel={`Fechar ${bolo.nome}`}
            style={styles.botaoFechar}
          />
          <CampoAutoGuardado
            style={styles.flex}
            label="Nome do bolo"
            valor={bolo.nome}
            aoGuardar={async (t) => {
              if (!t.trim()) return 'Indique um nome.';
              await mudar(() => atualizarBolo(db, bolo.id, { nome: t.trim() }));
            }}
          />
          {menu}
        </View>

        {bolo.linhas.length === 0 ? (
          <Text style={styles.secundario}>Ainda sem ingredientes.</Text>
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
            Ingrediente / material
          </Button>
          <Button
            mode="contained-tonal"
            icon="book-open-variant"
            compact
            onPress={() => router.push({ pathname: '/orcamento/receita', params: { boloId: String(bolo.id) } })}>
            Receita
          </Button>
          <Button
            mode="text"
            icon="plus"
            compact
            onPress={() =>
              router.push({ pathname: '/orcamento/linha', params: { boloId: String(bolo.id), livre: '1' } })
            }>
            Linha livre
          </Button>
        </View>

        <CampoAutoGuardado
          label="Tempo de trabalho"
          valor={bolo.tempo_min ? formatarTempo(bolo.tempo_min) : ''}
          ajuda="Ex.: 2h30, 2:30 ou 150 (minutos)"
          aoGuardar={async (t) => {
            const min = t.trim() === '' ? 0 : lerTempo(t);
            if (min === null) return 'Tempo inválido. Use, por exemplo, 2h30 ou 150.';
            await mudar(() => atualizarBolo(db, bolo.id, { tempo_min: min }));
          }}
        />

        <Divider />

        <View>
          <LinhaResumo rotulo="Ingredientes e materiais" valor={formatarEuro(calc.materiaisCent)} />
          <LinhaResumo
            rotulo={`Tempo (${horas} h × ${formatarEuro(orcamento.valor_hora_cent)})`}
            valor={formatarEuro(calc.tempoCent)}
          />
          <LinhaResumo
            rotulo={`Custos indiretos (${formatarDecimal(orcamento.indireto_pct, 2)} %)`}
            valor={formatarEuro(calc.indiretosCent)}
          />
          <LinhaResumo rotulo="Custo" valor={formatarEuro(calc.custoCent)} forte />
          <LinhaResumo
            rotulo={`Margem (${formatarDecimal(orcamento.margem_pct, 2)} % dos materiais)`}
            valor={formatarEuro(calc.margemCent)}
          />
          <LinhaResumo rotulo="Preço calculado" valor={formatarEuroInteiro(calc.precoCalcCent)} forte />
        </View>

        <CampoAutoGuardado
          label="Preço final"
          valor={String(calc.precoFinalCent / 100)}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="€" />}
          aoGuardar={async (t) => {
            const n = lerDecimal(t);
            if (n === null || n < 0) return 'Valor inválido.';
            const cent = Math.round(n) * 100;
            await mudar(() =>
              definirPrecoFinal(db, bolo.id, cent === calc.precoCalcCent ? null : cent, calc.precoCalcCent),
            );
          }}
        />

        {calc.ajustado ? (
          <View style={styles.ajuste}>
            <Text variant="bodyMedium" style={styles.flex}>
              Ajustado: {calc.diferencaCent > 0 ? '+' : ''}
              {formatarEuroInteiro(calc.diferencaCent)} face ao calculado.
            </Text>
            <Button
              mode="outlined"
              compact
              icon="restore"
              onPress={() => executar(() => definirPrecoFinal(db, bolo.id, null, calc.precoCalcCent))}>
              Repor calculado
            </Button>
          </View>
        ) : null}
        {calc.calculadoMudou ? (
          <Text variant="bodySmall" style={styles.aviso}>
            O preço calculado mudou desde o ajuste: era{' '}
            {formatarEuroInteiro(bolo.preco_calc_no_ajuste_cent ?? 0)}, agora é{' '}
            {formatarEuroInteiro(calc.precoCalcCent)}.
          </Text>
        ) : null}
        {calc.abaixoDoCusto ? (
          <Text variant="bodySmall" style={styles.erro}>
            Atenção: o preço final está abaixo do custo ({formatarEuro(calc.custoCent)}).
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
