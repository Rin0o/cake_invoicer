import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet } from 'react-native';

import { tema } from './theme';

/** Quanto tempo o banner fica no ecrã depois de carregado, e quanto dura o fade de saída. */
const TEMPO_VISIVEL_MS = 2000;
const FADE_MS = 400;

// O ecrã de arranque nativo só sai quando o banner já está desenhado, para não piscar em branco.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Banner da app (CakeForCash) ao abrir, por cima de tudo. Entretanto a base de dados abre por
 * baixo. Desaparece sozinho ao fim de alguns segundos, ou mais cedo com um toque.
 */
export function Abertura() {
  const [opacidade] = useState(() => new Animated.Value(1));
  const [carregado, setCarregado] = useState(false);
  const [visivel, setVisivel] = useState(true);

  const sair = () => {
    Animated.timing(opacidade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() =>
      setVisivel(false),
    );
  };

  useEffect(() => {
    if (!carregado) return;
    SplashScreen.hide();
    const t = setTimeout(sair, TEMPO_VISIVEL_MS);
    return () => clearTimeout(t);
    // `sair` só usa valores estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  if (!visivel) return null;
  return (
    <Animated.View style={[styles.fundo, { opacity: opacidade }]}>
      <Pressable style={styles.centro} onPress={sair} accessible={false}>
        <Image
          source={require('../../assets/images/banner.png')}
          style={styles.banner}
          resizeMode="contain"
          onLoad={() => setCarregado(true)}
          onError={() => setCarregado(true)}
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fundo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: tema.colors.background, zIndex: 10 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { width: '80%', maxWidth: 420, aspectRatio: 1 },
});
