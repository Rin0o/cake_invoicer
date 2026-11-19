import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Text, TouchableRipple } from 'react-native-paper';

import { ESTADOS, NOME_ESTADO, passosSeguintes, type EstadoOrcamento } from '@/domain/estados';
import { COR_ESTADO, espaco, tema } from '@/ui/theme';

type Icone = keyof typeof MaterialCommunityIcons.glyphMap;

/** Etiqueta grande com o estado atual; tocar abre a escolha de estado. */
export function BotaoEstado({ estado, onPress }: { estado: EstadoOrcamento; onPress: () => void }) {
  const cor = COR_ESTADO[estado];
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.botaoEstado, { backgroundColor: cor.fundo }]}
      accessibilityRole="button"
      accessibilityLabel={`Estado: ${NOME_ESTADO[estado]}. Tocar para mudar.`}>
      <View style={styles.botaoEstadoConteudo}>
        <MaterialCommunityIcons name={cor.icone as Icone} size={18} color={cor.texto} />
        <Text variant="labelLarge" style={{ color: cor.texto }}>
          {NOME_ESTADO[estado]}
        </Text>
        <MaterialCommunityIcons name="menu-down" size={20} color={cor.texto} />
      </View>
    </TouchableRipple>
  );
}

/** Botões com as ações seguintes do estado atual (ex.: "Cliente aceitou"). */
export function PassosSeguintes({
  estado,
  aoEscolher,
}: {
  estado: EstadoOrcamento;
  aoEscolher: (e: EstadoOrcamento) => void;
}) {
  const passos = passosSeguintes(estado);
  if (passos.length === 0) return null;
  return (
    <View style={styles.passos}>
      {passos.map((p) => (
        <Button
          key={p.estado}
          mode={p.principal ? 'contained' : 'outlined'}
          compact
          accessibilityLabel={p.descricao}
          onPress={() => aoEscolher(p.estado)}>
          {p.rotulo}
        </Button>
      ))}
    </View>
  );
}

/** Diálogo para escolher qualquer estado; o atual aparece marcado. */
export function DialogoEstado({
  visivel,
  titulo,
  estado,
  aoEscolher,
  aoFechar,
}: {
  visivel: boolean;
  titulo?: string;
  estado: EstadoOrcamento | null;
  aoEscolher: (e: EstadoOrcamento) => void;
  aoFechar: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visivel} onDismiss={aoFechar} style={styles.dialogo}>
        <Dialog.Title numberOfLines={1}>{titulo ?? 'Mudar estado'}</Dialog.Title>
        <Dialog.Content style={styles.dialogoConteudo}>
          {ESTADOS.map((e) => {
            const cor = COR_ESTADO[e];
            const atual = e === estado;
            return (
              <List.Item
                key={e}
                title={NOME_ESTADO[e]}
                titleStyle={atual && styles.atual}
                style={[styles.opcao, atual && { backgroundColor: cor.fundo }]}
                left={() => (
                  <View style={[styles.iconeOpcao, { backgroundColor: cor.fundo }]}>
                    <MaterialCommunityIcons name={cor.icone as Icone} size={20} color={cor.texto} />
                  </View>
                )}
                right={() =>
                  atual ? <MaterialCommunityIcons name="check" size={22} color={cor.texto} style={styles.check} /> : null
                }
                onPress={() => {
                  aoFechar();
                  if (!atual) aoEscolher(e);
                }}
                accessibilityState={{ selected: atual }}
              />
            );
          })}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={aoFechar}>Cancelar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  botaoEstado: { alignSelf: 'flex-start', borderRadius: 20 },
  botaoEstadoConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs + 2,
    paddingLeft: espaco.m - 4,
    paddingRight: espaco.s,
    paddingVertical: espaco.s,
  },
  passos: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: espaco.s },
  dialogo: { backgroundColor: tema.colors.surface },
  dialogoConteudo: { paddingHorizontal: espaco.s },
  opcao: { borderRadius: 12, paddingVertical: espaco.xs },
  iconeOpcao: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: espaco.s },
  atual: { fontWeight: 'bold' },
  check: { alignSelf: 'center' },
});
