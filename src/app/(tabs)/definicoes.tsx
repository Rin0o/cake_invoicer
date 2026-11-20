import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text, TextInput } from 'react-native-paper';

import { escolherBackup, exportarBackup, restaurarBackup } from '@/backup/backup';
import { guardarDefinicoes, obterDefinicoes, type Definicoes as DadosDefinicoes } from '@/db/repo';
import { centParaTexto, formatarDecimal, lerDecimal, lerEurosParaCent } from '@/domain/format';
import { COR_PDF_POR_OMISSAO } from '@/pdf/cores';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { EscolherCorPdf } from '@/ui/EscolherCorPdf';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

type CampoContacto =
  | 'contacto_telefone'
  | 'contacto_email'
  | 'contacto_instagram'
  | 'contacto_facebook'
  | 'contacto_tiktok'
  | 'contacto_site';

const CAMPOS_CONTACTO: {
  campo: CampoContacto;
  rotulo: string;
  exemplo: string;
  teclado: 'phone-pad' | 'email-address' | 'url' | 'default';
}[] = [
  { campo: 'contacto_telefone', rotulo: 'Telefone', exemplo: '912 345 678', teclado: 'phone-pad' },
  { campo: 'contacto_email', rotulo: 'Email', exemplo: 'encomendas@exemplo.pt', teclado: 'email-address' },
  { campo: 'contacto_instagram', rotulo: 'Instagram', exemplo: '@o.seu.negocio', teclado: 'default' },
  { campo: 'contacto_facebook', rotulo: 'Facebook', exemplo: 'nome da página', teclado: 'default' },
  { campo: 'contacto_tiktok', rotulo: 'TikTok', exemplo: '@o.seu.negocio', teclado: 'default' },
  { campo: 'contacto_site', rotulo: 'Site', exemplo: 'www.exemplo.pt', teclado: 'url' },
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

  async function guardar() {
    const valorHoraCent = lerEurosParaCent(valorHora);
    const indiretoPct = lerDecimal(indireto);
    const margemPct = lerDecimal(margem);
    if (valorHoraCent === null || valorHoraCent < 0) return setErro('Valor/hora inválido.');
    if (indiretoPct === null || indiretoPct < 0) return setErro('Custos indiretos inválidos.');
    if (margemPct === null || margemPct < 0) return setErro('Margem inválida.');
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
      avisar('Definições guardadas. Os preços aplicam-se aos novos orçamentos; o resto, a todos os PDF.');
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
      const data = new Date(backup.exportado_em).toLocaleString('pt-PT');
      const ok = await confirmar(
        'Restaurar backup?',
        `Todos os dados atuais (catálogo, receitas, orçamentos e definições) vão ser substituídos pelos do backup de ${data}. Isto não se pode desfazer.`,
        'Restaurar',
      );
      if (!ok) return;
      await restaurarBackup(db, backup);
      carregar();
      Alert.alert('Backup restaurado', 'Os dados foram substituídos.');
    } catch (e) {
      mostrarErro(e);
    } finally {
      setAOcupar(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium">Preços</Text>
      <TextInput
        mode="outlined"
        label="Valor por hora de trabalho"
        value={valorHora}
        onChangeText={setValorHora}
        keyboardType="decimal-pad"
        right={<TextInput.Affix text="€/h" />}
      />
      <View>
        <TextInput
          mode="outlined"
          label="Custos indiretos"
          value={indireto}
          onChangeText={setIndireto}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
        />
        <HelperText type="info">Energia, gás, desgaste. Aplica-se a materiais + tempo.</HelperText>
      </View>
      <View>
        <TextInput
          mode="outlined"
          label="Margem por omissão"
          value={margem}
          onChangeText={setMargem}
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
        />
        <HelperText type="info">
          Aplica-se só aos ingredientes e materiais. Pode ser ajustada em cada orçamento.
        </HelperText>
      </View>

      <Text variant="titleMedium" style={styles.titulo}>
        O seu negócio
      </Text>
      <View>
        <TextInput mode="outlined" label="Nome" value={nomeNegocio} onChangeText={setNomeNegocio} />
        <HelperText type="info">Aparece no topo do PDF e no título do resumo em texto. Pode ficar vazio.</HelperText>
      </View>

      <View style={styles.grupo}>
        <Text variant="titleSmall">Cor do PDF</Text>
        <EscolherCorPdf valor={corPdf} aoEscolher={setCorPdf} />
      </View>

      <View style={styles.grupo}>
        <Text variant="titleSmall">Contactos no PDF</Text>
        <Text variant="bodySmall" style={styles.secundario}>
          Aparecem no fundo do PDF. Os que ficarem vazios não aparecem.
        </Text>
        {CAMPOS_CONTACTO.map(({ campo, rotulo, exemplo, teclado }) => (
          <TextInput
            key={campo}
            mode="outlined"
            label={rotulo}
            placeholder={exemplo}
            value={contactos[campo]}
            onChangeText={(t) => setContactos((c) => ({ ...c, [campo]: t }))}
            keyboardType={teclado}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ))}
      </View>

      {erro ? <HelperText type="error">{erro}</HelperText> : null}
      <Button mode="contained" onPress={guardar}>
        Guardar definições
      </Button>

      <Divider style={styles.divisor} />

      <Text variant="titleMedium">Cópia de segurança</Text>
      <Text variant="bodyMedium" style={styles.secundario}>
        Os dados só existem neste telemóvel. Faça um backup com regularidade e guarde-o fora do telemóvel (Google
        Drive, ou envie-o para o seu email ou WhatsApp).
      </Text>
      <Button mode="contained-tonal" icon="export" onPress={exportar} disabled={aOcupar}>
        Exportar backup
      </Button>
      <Button mode="outlined" icon="import" onPress={importar} disabled={aOcupar}>
        Restaurar backup
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
