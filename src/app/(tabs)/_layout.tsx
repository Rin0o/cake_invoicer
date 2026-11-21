import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Image, StyleSheet, type ColorValue } from 'react-native';

import { textos } from '@/i18n';
import { corCabecalho, espaco, tema } from '@/ui/theme';

type Icone = keyof typeof MaterialCommunityIcons.glyphMap;
type PropsIcone = { color: ColorValue | null; size: number; focused: boolean };

function icone(nome: Icone, nomeAtivo: Icone) {
  return function IconeTab({ color, size, focused }: PropsIcone) {
    return (
      <MaterialCommunityIcons
        name={focused ? nomeAtivo : nome}
        color={typeof color === 'string' ? color : undefined}
        size={size}
      />
    );
  };
}

function Logo() {
  return <Image source={require('../../../assets/images/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />;
}

export default function TabLayout() {
  const t = textos().ecras;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tema.colors.primary,
        tabBarInactiveTintColor: tema.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: tema.colors.surface, borderTopColor: tema.colors.outlineVariant },
        tabBarLabelStyle: styles.rotulo,
        headerStyle: { backgroundColor: corCabecalho },
        headerTitleStyle: styles.titulo,
        headerTintColor: tema.colors.primary,
        headerLeft: Logo,
        sceneStyle: { backgroundColor: tema.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t.orcamentos, tabBarIcon: icone('file-document-outline', 'file-document') }}
      />
      <Tabs.Screen name="receitas" options={{ title: t.receitas, tabBarIcon: icone('book-outline', 'book-open-variant') }} />
      <Tabs.Screen name="catalogo" options={{ title: t.catalogo, tabBarIcon: icone('basket-outline', 'basket') }} />
      <Tabs.Screen name="definicoes" options={{ title: t.definicoes, tabBarIcon: icone('cog-outline', 'cog') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: { width: 36, height: 36, marginLeft: espaco.m },
  titulo: { fontWeight: 'bold' },
  rotulo: { fontWeight: '600' },
});
