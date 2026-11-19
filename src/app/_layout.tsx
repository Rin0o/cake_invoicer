import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { migrar } from '@/db/migrations';
import { tema } from '@/ui/theme';

function ACarregar() {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={tema.colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={tema}>
      <StatusBar style="dark" />
      <Suspense fallback={<ACarregar />}>
        <SQLiteProvider databaseName="orcamentos.db" onInit={migrar} useSuspense>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: tema.colors.surface },
              headerTintColor: tema.colors.onSurface,
              contentStyle: { backgroundColor: tema.colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
            <Stack.Screen name="orcamento/[id]" options={{ title: 'Orçamento' }} />
            <Stack.Screen name="orcamento/linha" options={{ title: 'Linha' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.colors.background },
});
