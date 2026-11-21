import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, List, Portal, RadioButton } from 'react-native-paper';

import { IDIOMAS, NOME_IDIOMA, textos, type Idioma } from '@/i18n';
import { espaco, tema } from '@/ui/theme';

/**
 * Linha "Idioma" das definições; tocar abre a escolha. `valor` é a preferência guardada
 * ('' = idioma do telemóvel). Os idiomas aparecem com o nome na própria língua, para quem não
 * percebe o idioma atual os encontrar; o ícone de tradução ajuda a encontrar a linha.
 */
export function EscolherIdioma({ valor, aoEscolher }: { valor: Idioma | ''; aoEscolher: (v: Idioma | '') => void }) {
  const t = textos();
  const [aberto, setAberto] = useState(false);
  const descricao = valor ? NOME_IDIOMA[valor] : t.definicoes.automatico;

  function escolher(v: string) {
    setAberto(false);
    if (v !== valor) aoEscolher(v as Idioma | '');
  }

  return (
    <>
      <List.Item
        title={t.definicoes.idioma}
        description={descricao}
        left={(p) => <List.Icon {...p} icon="translate" />}
        right={(p) => <List.Icon {...p} icon="menu-down" />}
        onPress={() => setAberto(true)}
        style={styles.linha}
        accessibilityRole="button"
      />
      <Portal>
        <Dialog visible={aberto} onDismiss={() => setAberto(false)} style={styles.dialogo}>
          <Dialog.Title>{t.definicoes.idioma}</Dialog.Title>
          <Dialog.Content style={styles.conteudo}>
            <RadioButton.Group value={valor} onValueChange={escolher}>
              <RadioButton.Item label={t.definicoes.automatico} value="" style={styles.opcao} />
              {IDIOMAS.map((i) => (
                <RadioButton.Item key={i} label={NOME_IDIOMA[i]} value={i} style={styles.opcao} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAberto(false)}>{t.comum.cancelar}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  linha: { paddingHorizontal: 0, marginHorizontal: -espaco.s },
  dialogo: { backgroundColor: tema.colors.surface },
  conteudo: { paddingHorizontal: espaco.s },
  opcao: { borderRadius: 12 },
});
