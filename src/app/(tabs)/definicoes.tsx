import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text, TextInput } from 'react-native-paper';

import { escolherBackup, exportarBackup, restaurarBackup } from '@/backup/backup';
import {
  guardarDefinicoes,
  guardarIdioma,
  obterDefinicoes,
  type Definicoes as DadosDefinicoes,
} from '@/db/repo';
import { centParaTexto, formatarDecimal, lerDecimal, lerEurosParaCent } from '@/domain/format';
import { ehIdioma, textos, type Idioma } from '@/i18n';
import { aplicarPreferenciaIdioma } from '@/i18n/dispositivo';
import { COR_PDF_POR_OMISSAO } from '@/pdf/cores';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { EscolherCorPdf } from '@/ui/EscolherCorPdf';
import { EscolherIdioma } from '@/ui/EscolherIdioma';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

type CampoContacto =
  | 'contacto_telefone'
  | 'contacto_email'
  | 'contacto_instagram'
  | 'contacto_facebook'
  | 'contacto_tiktok'
  | 'contacto_site';

/** Campos de contacto; o rótulo e o exemplo vêm de `textos().definicoes.contactos[texto]`. */
const CAMPOS_CONTACTO: {
  campo: CampoContacto;
  texto: keyof ReturnType<typeof textos>['definicoes']['contactos'];
  teclado: 'phone-pad' | 'email-address' | 'url' | 'default';
}[] = [
  { campo: 'contacto_telefone', texto: 'telefone', teclado: 'phone-pad' },
  { campo: 'contacto_email', texto: 'email', teclado: 'email-address' },
  { campo: 'contacto_instagram', texto: 'instagram', teclado: 'default' },
  { campo: 'contacto_facebook', texto: 'facebook', teclado: 'default' },
  { campo: 'contacto_tiktok', texto: 'tiktok', teclado: 'default' },
  { campo: 'contacto_site', texto: 'site', teclado: 'url' },
];

const CONTACTOS_VAZIOS: Record<CampoContacto, string> = {
  contacto_telefone: '',
  contacto_email: '',
  contacto_instagram: '',
  contacto_facebook: '',
  contacto_tiktok: '',
  contacto_site: '',
};

function contactosDe(d: DadosDefinicoes): Record<CampoContacto, string> {
  return Object.fromEntries(CAMPOS_CONTACTO.map(({ campo }) => [campo, d[campo]])) as Record<CampoContacto, string>;
}

export default function Definicoes() {
  const db = useSQLiteContext();
  const t = textos();
  const [idioma, setIdioma] = useState<Idioma | ''>('');
  const [valorHora, setValorHora] = useState('');
  const [indireto, setIndireto] = useState('');
  const [margem, setMargem] = useState('');
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [corPdf, setCorPdf] = useState(COR_PDF_POR_OMISSAO);
  const [contactos, setContactos] = useState(CONTACTOS_VAZIOS);
  const [erro, setErro] = useState<string | null>(null);
  const [aOcupar, setAOcupar] = useState(false);

  const carregar = useCallback(() => {
    obterDefinicoes(db)
      .then((d) => {
        setIdioma(ehIdioma(d.idioma) ? d.idioma : '');
        setValorHora(centParaTexto(d.valor_hora_cent));
        setIndireto(formatarDecimal(d.custo_indireto_pct, 2));
        setMargem(formatarDecimal(d.margem_pct, 2));
        setNomeNegocio(d.nome_negocio);
        setCorPdf(d.pdf_cor);
        setContactos(contactosDe(d));
        setErro(null);
      })
      .catch(mostrarErro);
  }, [db]);

  useFocusEffect(carregar);

  /**
   * Aplica-se logo, sem "Guardar definições". Os ecrãs voltam a ser montados no idioma novo
   * (ver `_layout.tsx`), por isso o que estiver escrito e não guardado neste ecrã perde-se.
   */
  async function mudarIdioma(novo: Idioma | '') {
    try {
      await guardarIdioma(db, novo);
      setIdioma(novo);
      aplicarPreferenciaIdioma(novo);
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function guardar() {
    const valorHoraCent = lerEurosParaCent(valorHora);
    const indiretoPct = lerDecimal(indireto);
    const margemPct = lerDecimal(margem);
    if (valorHoraCent === null || valorHoraCent < 0) return setErro(t.definicoes.valorHoraInvalido);
    if (indiretoPct === null || indiretoPct < 0) return setErro(t.definicoes.custosIndiretosInvalidos);
    if (margemPct === null || margemPct < 0) return setErro(t.comum.margemInvalida);
    setErro(null);
    try {
      const limpos = Object.fromEntries(
        CAMPOS_CONTACTO.map(({ campo }) => [campo, contactos[campo].trim()]),
      ) as Record<CampoContacto, string>;
      await guardarDefinicoes(db, {
        valor_hora_cent: valorHoraCent,
        custo_indireto_pct: indiretoPct,
        margem_pct: margemPct,
        nome_negocio: nomeNegocio.trim(),
        pdf_cor: corPdf,
        ...limpos,
      });
      avisar(t.definicoes.guardadas);
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function exportar() {
    setAOcupar(true);
    try {
      await exportarBackup(db);
    } catch (e) {
      mostrarErro(e);
    } finally {
      setAOcupar(false);
    }
  }

  async function importar() {
    setAOcupar(true);
    try {
      const backup = await escolherBackup(db);
      if (!backup) return;
      const data = new Date(backup.exportado_em).toLocaleString(t.locale);
      const ok = await confirmar(
        t.definicoes.restaurarTitulo,
        t.definicoes.restaurarMensagem(data),
        t.definicoes.restaurarBotao,
      );
      if (!ok) return;
      await restaurarBackup(db, backup);
      // O backup traz o idioma: os textos seguintes já saem nele.
      aplicarPreferenciaIdioma((await obterDefinicoes(db)).idioma);
      const t2 = textos().definicoes;
      Alert.alert(t2.restaurado, t2.restauradoMensagem);
      carregar();
    } catch (e) {
      mostrarErro(e);
    } finally {
      setAOcupar(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <EscolherIdioma valor={idioma} aoEscolher={mudarIdioma} />

      <Text variant="titleMedium">{t.definicoes.precos}</Text>
      <TextInput
        mode="outlined"
        label={t.definicoes.valorHora}
        value={valorHora}
        onChangeText={setValorHora}
        keyboardType="decimal-pad"
        right={<TextInput.Affix text="€/h" />}
      />
      <View>
        <TextInput
          mode="outlined"
          label={t.definicoes.custosIndiretos}
          value={indireto}
          onChangeText={setIndireto}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
        />
        <HelperText type="info">{t.definicoes.ajudaIndiretos}</HelperText>
      </View>
      <View>
        <TextInput
          mode="outlined"
          label={t.definicoes.margemPorOmissao}
          value={margem}
          onChangeText={setMargem}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
        />
        <HelperText type="info">{t.definicoes.ajudaMargem}</HelperText>
      </View>

      <Text variant="titleMedium" style={styles.titulo}>
        {t.definicoes.oSeuNegocio}
      </Text>
      <View>
        <TextInput mode="outlined" label={t.comum.nome} value={nomeNegocio} onChangeText={setNomeNegocio} />
        <HelperText type="info">{t.definicoes.ajudaNome}</HelperText>
      </View>

      <View style={styles.grupo}>
        <Text variant="titleSmall">{t.definicoes.corPdf}</Text>
        <EscolherCorPdf valor={corPdf} aoEscolher={setCorPdf} />
      </View>

      <View style={styles.grupo}>
        <Text variant="titleSmall">{t.definicoes.contactosPdf}</Text>
        <Text variant="bodySmall" style={styles.secundario}>
          {t.definicoes.ajudaContactos}
        </Text>
        {CAMPOS_CONTACTO.map(({ campo, texto, teclado }) => (
          <TextInput
            key={campo}
            mode="outlined"
            label={t.definicoes.contactos[texto].rotulo}
            placeholder={t.definicoes.contactos[texto].exemplo}
            value={contactos[campo]}
            onChangeText={(v) => setContactos((c) => ({ ...c, [campo]: v }))}
            keyboardType={teclado}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ))}
      </View>

      {erro ? <HelperText type="error">{erro}</HelperText> : null}
      <Button mode="contained" onPress={guardar}>
        {t.definicoes.guardar}
      </Button>

      <Divider style={styles.divisor} />

      <Text variant="titleMedium">{t.definicoes.copiaSeguranca}</Text>
      <Text variant="bodyMedium" style={styles.secundario}>
        {t.definicoes.ajudaBackup}
      </Text>
      <Button mode="contained-tonal" icon="export" onPress={exportar} disabled={aOcupar}>
        {t.definicoes.exportar}
      </Button>
      <Button mode="outlined" icon="import" onPress={importar} disabled={aOcupar}>
        {t.definicoes.restaurar}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.m, paddingBottom: espaco.l * 2 },
  titulo: { marginTop: espaco.s },
  grupo: { gap: espaco.s },
  divisor: { marginVertical: espaco.s },
  secundario: { color: tema.colors.onSurfaceVariant },
});
