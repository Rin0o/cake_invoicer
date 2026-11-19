import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** `true` enquanto o teclado está aberto (para esconder barras fixas que tapariam o campo). */
export function useTecladoVisivel() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setVisivel(true));
    const esconder = Keyboard.addListener('keyboardDidHide', () => setVisivel(false));
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);
  return visivel;
}
