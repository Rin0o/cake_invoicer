import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { tema } from '@/ui/theme';

type Icone = keyof typeof MaterialCommunityIcons.glyphMap;
type PropsIcone = { color: ColorValue | null; size: number };

function icone(nome: Icone) {
  return function IconeTab({ color, size }: PropsIcone) {
    return <MaterialCommunityIcons name={nome} color={typeof color === 'string' ? color : undefined} size={size} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tema.colors.primary,
        headerStyle: { backgroundColor: tema.colors.surface },
        sceneStyle: { backgroundColor: tema.colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Orçamentos', tabBarIcon: icone('file-document-outline') }} />
      <Tabs.Screen name="catalogo" options={{ title: 'Catálogo', tabBarIcon: icone('basket-outline') }} />
      <Tabs.Screen name="definicoes" options={{ title: 'Definições', tabBarIcon: icone('cog-outline') }} />
    </Tabs>
  );
}
