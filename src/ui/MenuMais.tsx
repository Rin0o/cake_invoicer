import { useState } from 'react';
import { Divider, IconButton, Menu } from 'react-native-paper';

import { textos } from '@/i18n';
import { tema } from '@/ui/theme';

export interface OpcaoMenu {
  titulo: string;
  icone: string;
  aoEscolher: () => void;
  /** Ações destrutivas (apagar) aparecem a vermelho, no fim, separadas das outras. */
  destrutiva?: boolean;
  desativada?: boolean;
}

/**
 * Menu "⋮" com ações menos frequentes. As ações destrutivas ficam aqui, longe dos botões
 * do dia a dia, para não se carregar nelas por engano (e continuam a pedir confirmação).
 */
export function MenuMais({ opcoes, descricao }: { opcoes: OpcaoMenu[]; descricao?: string }) {
  const [aberto, setAberto] = useState(false);
  const normais = opcoes.filter((o) => !o.destrutiva);
  const destrutivas = opcoes.filter((o) => o.destrutiva);

  function escolher(o: OpcaoMenu) {
    setAberto(false);
    o.aoEscolher();
  }

  return (
    <Menu
      visible={aberto}
      onDismiss={() => setAberto(false)}
      anchorPosition="bottom"
      anchor={<IconButton icon="dots-vertical" onPress={() => setAberto(true)} accessibilityLabel={descricao ?? textos().comum.maisOpcoes} />}>
      {normais.map((o) => (
        <Menu.Item key={o.titulo} leadingIcon={o.icone} title={o.titulo} disabled={o.desativada} onPress={() => escolher(o)} />
      ))}
      {normais.length > 0 && destrutivas.length > 0 ? <Divider /> : null}
      {destrutivas.map((o) => (
        <Menu.Item
          key={o.titulo}
          leadingIcon={o.icone}
          title={o.titulo}
          titleStyle={{ color: tema.colors.error }}
          disabled={o.desativada}
          onPress={() => escolher(o)}
        />
      ))}
    </Menu>
  );
}
