/**
 * Gravação automática com indicação de estado, para os editores que guardam ao sair de
 * cada campo (orçamento e receita).
 *
 * - `useGestorGuardar()` cria o gestor no ecrã; o ecrã envolve o conteúdo em
 *   `<GestorGuardar.Provider value={gestor}>`.
 * - `CampoAutoGuardado` grava através do gestor e regista-se nele, para que "Concluído"
 *   possa guardar o campo que ainda está a ser editado.
 * - O cabeçalho não está dentro do Provider (é desenhado pelo navegador), por isso recebe
 *   o gestor por props: `<EstadoGravacao estado={gestor.estado} />`.
 */
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, ToastAndroid, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { mostrarErro } from '@/ui/confirmar';
import { tema } from '@/ui/theme';

export type EstadoGravacao = 'a-guardar' | 'guardado' | 'erro' | null;

/** Guarda o valor pendente de um campo; devolve `false` se o valor não for válido. */
type Pendente = () => Promise<boolean>;

export interface Gestor {
  estado: EstadoGravacao;
  /**
   * Executa uma gravação e atualiza o estado. Devolve a mensagem de erro de validação
   * (ou "Não foi possível guardar." se falhar), ou nada se correu bem.
   */
  executar: (fn: () => Promise<string | void> | string | void) => Promise<string | void>;
  /** Regista um campo; devolve a função para o retirar. */
  registar: (pendente: Pendente) => () => void;
  /** Guarda todos os campos pendentes e espera pelas gravações em curso. */
  concluir: () => Promise<boolean>;
}

export const GestorGuardar = createContext<Gestor | null>(null);

export function useGestor() {
  return useContext(GestorGuardar);
}

export function useGestorGuardar(): Gestor {
  const [estado, setEstado] = useState<EstadoGravacao>(null);
  const emCurso = useRef(new Set<Promise<unknown>>());
  const campos = useRef(new Set<Pendente>());

  const executar = useCallback<Gestor['executar']>(async (fn) => {
    setEstado('a-guardar');
    const p = (async () => {
      try {
        const erro = await fn();
        setEstado(erro ? 'erro' : 'guardado');
        return erro;
      } catch (e) {
        setEstado('erro');
        mostrarErro(e);
        return 'Não foi possível guardar.';
      }
    })();
    emCurso.current.add(p);
    try {
      return await p;
    } finally {
      emCurso.current.delete(p);
    }
  }, []);

  const registar = useCallback<Gestor['registar']>((pendente) => {
    campos.current.add(pendente);
    return () => {
      campos.current.delete(pendente);
    };
  }, []);

  const concluir = useCallback(async () => {
    const resultados = await Promise.all([...campos.current].map((f) => f()));
    await Promise.all([...emCurso.current]);
    return resultados.every(Boolean);
  }, []);

  return useMemo(() => ({ estado, executar, registar, concluir }), [estado, executar, registar, concluir]);
}

const TEXTO: Record<Exclude<EstadoGravacao, null>, string> = {
  'a-guardar': 'A guardar…',
  guardado: 'Guardado ✓',
  erro: 'Há um valor por corrigir',
};

/** Título do cabeçalho com o estado da gravação por baixo. */
export function TituloComEstado({ titulo, estado }: { titulo: string; estado: EstadoGravacao }) {
  return (
    <View style={styles.titulo}>
      <Text variant="titleLarge" numberOfLines={1}>
        {titulo}
      </Text>
      {estado ? (
        <Text variant="bodySmall" style={estado === 'erro' ? styles.erro : styles.estado}>
          {TEXTO[estado]}
        </Text>
      ) : null}
    </View>
  );
}

/** Mensagem curta de sucesso, que fica visível depois de voltar ao ecrã anterior. */
export function avisar(mensagem: string) {
  ToastAndroid.show(mensagem, ToastAndroid.SHORT);
}

/**
 * "Concluído": guarda o campo que está a ser editado, espera que tudo fique gravado,
 * confirma com uma mensagem e volta ao ecrã anterior. Se houver um valor inválido, fica.
 */
export function BotaoConcluido({ gestor, mensagem }: { gestor: Gestor; mensagem: string }) {
  const [aConcluir, setAConcluir] = useState(false);

  async function concluir() {
    setAConcluir(true);
    try {
      Keyboard.dismiss();
      if (!(await gestor.concluir())) {
        Alert.alert(
          'Falta corrigir um valor',
          'Há um campo com um valor inválido (a vermelho). Corrija-o antes de sair; o resto já está guardado.',
        );
        return;
      }
      avisar(mensagem);
      router.back();
    } finally {
      setAConcluir(false);
    }
  }

  return (
    <Button mode="contained-tonal" icon="check" compact onPress={concluir} loading={aConcluir} disabled={aConcluir}>
      Concluído
    </Button>
  );
}

const styles = StyleSheet.create({
  titulo: { flexShrink: 1 },
  estado: { color: tema.colors.onSurfaceVariant },
  erro: { color: tema.colors.error },
});
