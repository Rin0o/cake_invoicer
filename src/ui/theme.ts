import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import type { EstadoOrcamento } from '@/domain/estados';

/** Paleta: azul claro como base, com dourado (moeda) e chocolate (base do bolo) do ícone. */
export const tema: MD3Theme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1F6FB2',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D3E8FF',
    onPrimaryContainer: '#001D36',
    secondary: '#8A5A00',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE08A',
    onSecondaryContainer: '#2A1800',
    tertiary: '#7A4B35',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFDBCB',
    onTertiaryContainer: '#2E1500',
    background: '#EEF6FF',
    surface: '#FFFFFF',
    surfaceVariant: '#DEE8F3',
    onSurfaceVariant: '#3F4954',
    outline: '#6F7B88',
    outlineVariant: '#C3D3E4',
    error: '#BA1A1A',
    elevation: {
      level0: 'transparent',
      level1: '#F6FAFF',
      level2: '#EFF6FF',
      level3: '#E9F2FE',
      level4: '#E6F0FD',
      level5: '#E1EDFC',
    },
  },
};

export const espaco = { xs: 4, s: 8, m: 16, l: 24 };

/** Fundo dos cabeçalhos (azul claro, para o texto e os botões escuros continuarem legíveis). */
export const corCabecalho = '#DCEEFF';

type Cores = { fundo: string; texto: string; icone: string };

/** Cor e ícone de cada estado, para os cartões da lista e as etiquetas. */
export const COR_ESTADO: Record<EstadoOrcamento, Cores> = {
  rascunho: { fundo: '#EEE6E9', texto: '#5A4E53', icone: 'pencil-outline' },
  enviado: { fundo: '#DCEBFF', texto: '#1F4E8C', icone: 'send-outline' },
  aceite: { fundo: '#D5F2DD', texto: '#1E6B3A', icone: 'check-circle-outline' },
  recusado: { fundo: '#FFDAD6', texto: '#93000A', icone: 'close-circle-outline' },
  entregue: { fundo: '#FFE9B0', texto: '#6B4700', icone: 'gift-outline' },
};

/** Props de um Chip de estado: quando selecionado, usa a cor do estado. */
export function estiloChipEstado(estado: EstadoOrcamento, selecionado: boolean) {
  if (!selecionado) return {};
  const cor = COR_ESTADO[estado];
  return { style: { backgroundColor: cor.fundo }, textStyle: { color: cor.texto }, selectedColor: cor.texto };
}
