import { Alert } from 'react-native';

import { textos } from '@/i18n';

/** Pede confirmação antes de uma ação destrutiva. O botão é "Apagar" se não se indicar outro. */
export function confirmar(titulo: string, mensagem: string, botao?: string): Promise<boolean> {
  const t = textos().comum;
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: t.cancelar, style: 'cancel', onPress: () => resolve(false) },
      { text: botao ?? t.apagar, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function mostrarErro(e: unknown) {
  Alert.alert(textos().comum.erro, e instanceof Error ? e.message : String(e));
}
