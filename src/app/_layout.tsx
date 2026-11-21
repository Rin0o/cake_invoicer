import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { migrar } from '@/db/migrations';
import { obterDefinicoes } from '@/db/repo';
import { idiomaAtual, subscreverIdioma, textos } from '@/i18n';
import { aplicarPreferenciaIdioma } from '@/i18n/dispositivo';
import { corCabecalho, tema } from '@/ui/theme';

function ACarregar() {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={tema.colors.primary} />
    </View>
  );
}

/** Abre a base: migra e aplica o idioma guardado antes do primeiro ecrã. */
async function iniciar(db: SQLiteDatabase) {
  // Se a migração falhar, a mensagem de erro já sai no idioma do telemóvel.
  aplicarPreferenciaIdioma('');
  await migrar(db);
  aplicarPreferenciaIdioma((await obterDefinicoes(db)).idioma);
}

/**
 * Navegação. A `key` com o idioma volta a montar todos os ecrãs quando o idioma muda, para nenhum
 * ficar com textos ou preços formatados no idioma anterior.
 */
function Navegacao() {
  const idioma = useSyncExternalStore(subscreverIdioma, idiomaAtual);
  const t = textos().ecras;
  return (
    <Stack
      key={idioma}
      screenOptions={{
        headerStyle: { backgroundColor: corCabecalho },
        headerTintColor: tema.colors.onSurface,
        contentStyle: { backgroundColor: tema.colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/[id]" options={{ title: t.item }} />
      <Stack.Screen name="orcamento/[id]" options={{ title: t.orcamento }} />
      <Stack.Screen name="orcamento/linha" options={{ title: t.linha }} />
      <Stack.Screen name="orcamento/receita" options={{ title: t.adicionarReceita }} />
      <Stack.Screen name="receita/[id]" options={{ title: t.receita }} />
      <Stack.Screen name="receita/linha" options={{ title: t.linha }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={tema}>
      <StatusBar style="dark" />
      <Suspense fallback={<ACarregar />}>
        <SQLiteProvider databaseName="orcamentos.db" onInit={iniciar} useSuspense>
          <Navegacao />
        </SQLiteProvider>
      </Suspense>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.colors.background },
});
