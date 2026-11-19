import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, type TextInputProps } from 'react-native-paper';

import { useGestor } from '@/ui/Guardar';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  /** Valor guardado, já formatado para o campo. */
  valor: string;
  /**
   * Chamado ao sair do campo (ou em "Concluído"), se o texto mudou. Devolve uma mensagem
   * de erro (o valor não é guardado) ou nada (guardado). Pode lançar erro.
   */
  aoGuardar: (texto: string) => Promise<string | void> | string | void;
  ajuda?: string;
};

/**
 * Campo de texto que guarda ao sair do campo, sem botão "Guardar".
 * Dentro de um `GestorGuardar`, mostra o estado no cabeçalho e é guardado por "Concluído".
 */
export function CampoAutoGuardado({ valor, aoGuardar, ajuda, style, ...props }: Props) {
  const gestor = useGestor();
  const [texto, setTexto] = useState(valor);
  const [erro, setErro] = useState<string | null>(null);
  const [valorAnterior, setValorAnterior] = useState(valor);

  // Acompanha alterações vindas de fora (ex.: "Repor calculado").
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
    setErro(null);
  }

  // Evita gravar o mesmo texto duas vezes (sair do campo e "Concluído" ao mesmo tempo).
  const emCurso = useRef<{ texto: string; p: Promise<boolean> } | null>(null);

  async function guardar(): Promise<boolean> {
    if (texto === valor) {
      setErro(null);
      return true;
    }
    if (emCurso.current?.texto === texto) return emCurso.current.p;
    const t = texto;
    const p = (async () => {
      const resultado = gestor
        ? await gestor.executar(() => aoGuardar(t))
        : await aoGuardar(t);
      setErro(resultado || null);
      return !resultado;
    })();
    emCurso.current = { texto: t, p };
    try {
      return await p;
    } finally {
      if (emCurso.current?.p === p) emCurso.current = null;
    }
  }

  // O gestor chama sempre a versão mais recente de `guardar` (com o texto atual).
  const guardarRef = useRef(guardar);
  useEffect(() => {
    guardarRef.current = guardar;
  });
  useEffect(() => gestor?.registar(() => guardarRef.current()), [gestor]);

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
