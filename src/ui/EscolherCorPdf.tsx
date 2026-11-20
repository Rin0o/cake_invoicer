import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

import { CORES_PDF } from '@/pdf/cores';
import { espaco, tema } from '@/ui/theme';

/** Círculos com as cores do PDF, quatro por linha; a escolhida tem um visto e um aro. */
export function EscolherCorPdf({ valor, aoEscolher }: { valor: string; aoEscolher: (id: string) => void }) {
  return (
    <View style={styles.grelha} accessibilityRole="radiogroup">
      {CORES_PDF.map((c) => {
        const escolhida = c.id === valor;
        return (
          <TouchableRipple
            key={c.id}
            onPress={() => aoEscolher(c.id)}
            borderless
            style={styles.opcao}
            accessibilityRole="radio"
            accessibilityLabel={c.nome}
            accessibilityState={{ checked: escolhida }}>
            <View style={styles.opcaoConteudo}>
              <View style={[styles.aro, escolhida && { borderColor: c.principal }]}>
                <View style={[styles.circulo, { backgroundColor: c.principal }]}>
                  {escolhida ? <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" /> : null}
                </View>
              </View>
              <Text
                variant="labelMedium"
                numberOfLines={2}
                style={[styles.nome, escolhida && styles.nomeEscolhido]}>
                {c.nome}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grelha: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaco.s },
  opcao: { width: '25%', borderRadius: 12 },
  opcaoConteudo: { alignItems: 'center', gap: espaco.xs, paddingVertical: espaco.xs },
  aro: { padding: 3, borderRadius: 28, borderWidth: 2, borderColor: 'transparent' },
  circulo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nome: { color: tema.colors.onSurfaceVariant, textAlign: 'center' },
  nomeEscolhido: { color: tema.colors.onSurface, fontWeight: 'bold' },
});
