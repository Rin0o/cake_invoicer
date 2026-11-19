import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text, TextInput } from 'react-native-paper';

import { escolherBackup, exportarBackup, restaurarBackup } from '@/backup/backup';
import { guardarDefinicoes, obterDefinicoes } from '@/db/repo';
import { centParaTexto, formatarDecimal, lerDecimal, lerEurosParaCent } from '@/domain/format';
import { confirmar, mostrarErro } from '@/ui/confirmar';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

export default function Definicoes() {
  const db = useSQLiteContext();
  const [valorHora, setValorHora] = useState('');
  const [indireto, setIndireto] = useState('');
  const [margem, setMargem] = useState('');
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aOcupar, setAOcupar] = useState(false);

  const carregar = useCallback(() => {
    obterDefinicoes(db)
      .then((d) => {
        setValorHora(centParaTexto(d.valor_hora_cent));
        setIndireto(formatarDecimal(d.custo_indireto_pct, 2));
        setMargem(formatarDecimal(d.margem_pct, 2));
        setNomeNegocio(d.nome_negocio);
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
      await guardarDefinicoes(db, {
        valor_hora_cent: valorHoraCent,
        custo_indireto_pct: indiretoPct,
        margem_pct: margemPct,
        nome_negocio: nomeNegocio.trim(),
      });
      avisar('Definições guardadas. Aplicam-se aos novos orçamentos.');
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
        <HelperText type="info">Aparece no título do resumo em texto. Pode ficar vazio.</HelperText>
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
  divisor: { marginVertical: espaco.s },
  secundario: { color: tema.colors.onSurfaceVariant },
});
