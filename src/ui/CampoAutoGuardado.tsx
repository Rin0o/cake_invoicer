import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, type TextInputProps } from 'react-native-paper';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  /** Valor guardado, já formatado para o campo. */
  valor: string;
  /**
   * Chamado ao sair do campo, se o texto mudou. Devolve uma mensagem de erro
   * (o valor não é guardado) ou nada (guardado).
   */
  aoGuardar: (texto: string) => Promise<string | void> | string | void;
  ajuda?: string;
};

/** Campo de texto que guarda ao sair do campo, sem botão "Guardar". */
export function CampoAutoGuardado({ valor, aoGuardar, ajuda, style, ...props }: Props) {
  const [texto, setTexto] = useState(valor);
  const [erro, setErro] = useState<string | null>(null);
  const [valorAnterior, setValorAnterior] = useState(valor);

  // Acompanha alterações vindas de fora (ex.: "Repor calculado").
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
    setErro(null);
  }

  async function guardar() {
    if (texto === valor) {
      setErro(null);
      return;
    }
    const resultado = await aoGuardar(texto);
    setErro(resultado || null);
  }

  return (
    <View style={style}>
      <TextInput mode="outlined" dense {...props} value={texto} onChangeText={setTexto} onBlur={guardar} error={!!erro} />
      {erro ? (
        <HelperText type="error">{erro}</HelperText>
      ) : ajuda ? (
        <HelperText type="info" style={styles.ajuda}>
          {ajuda}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ ajuda: { paddingTop: 0 } });
