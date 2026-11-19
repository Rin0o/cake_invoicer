import { Alert } from 'react-native';

/** Pede confirmação antes de uma ação destrutiva. */
export function confirmar(titulo: string, mensagem: string, botao = 'Apagar'): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: botao, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function mostrarErro(e: unknown) {
  Alert.alert('Erro', e instanceof Error ? e.message : String(e));
}
