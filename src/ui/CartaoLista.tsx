import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { Avatar, Surface, Text, TouchableRipple } from 'react-native-paper';

import { espaco, tema } from '@/ui/theme';

type Props = {
  titulo: string;
  tituloEstilo?: StyleProp<TextStyle>;
  /** Linha por baixo do título: texto simples ou elementos (ex.: etiqueta de estado). */
  descricao?: ReactNode;
  icone: string;
  corIcone: string;
  fundoIcone: string;
  /** Conteúdo à direita (ex.: preço). */
  direita?: ReactNode;
  /** Mostra o cartão esbatido (ex.: item inativo). */
  esbatido?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  /** Descrição para leitores de ecrã do que faz o toque longo. */
  dicaAcessibilidade?: string;
};

/** Linha das listas principais, em forma de cartão com ícone colorido. */
export function CartaoLista(p: Props) {
  return (
    <Surface style={[styles.cartao, p.esbatido && styles.esbatido]} elevation={1}>
      <TouchableRipple
        onPress={p.onPress}
        onLongPress={p.onLongPress}
        accessibilityHint={p.dicaAcessibilidade}
        style={styles.toque}
        borderless>
        <View style={styles.conteudo}>
          <Avatar.Icon size={44} icon={p.icone} color={p.corIcone} style={{ backgroundColor: p.fundoIcone }} />
          <View style={styles.texto}>
            <Text variant="titleMedium" numberOfLines={1} style={p.tituloEstilo}>
              {p.titulo}
            </Text>
            {typeof p.descricao === 'string' ? (
              <Text variant="bodyMedium" numberOfLines={1} style={styles.descricao}>
                {p.descricao}
              </Text>
            ) : (
              p.descricao
            )}
          </View>
          {p.direita}
        </View>
      </TouchableRipple>
    </Surface>
  );
}

/** Pequena etiqueta colorida (ex.: estado do orçamento). */
export function Etiqueta({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.etiqueta, { backgroundColor: fundo }]}>
      <Text variant="labelMedium" style={{ color: cor }}>
        {texto}
      </Text>
    </View>
  );
}

const raio = 16;

const styles = StyleSheet.create({
  cartao: {
    marginHorizontal: espaco.m,
    marginVertical: espaco.xs + 2,
    borderRadius: raio,
    backgroundColor: tema.colors.surface,
  },
  esbatido: { opacity: 0.6 },
  toque: { borderRadius: raio },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, padding: espaco.m - 4, paddingRight: espaco.m },
  texto: { flex: 1, gap: 2 },
  descricao: { color: tema.colors.onSurfaceVariant },
  etiqueta: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: espaco.s, paddingVertical: 1 },
});
