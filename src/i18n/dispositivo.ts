import { getLocales } from 'expo-localization';

import { definirIdioma, resolverIdioma } from '@/i18n';

/** Código de língua preferido do telemóvel ("pt", "en"…), ou `null`. */
export function linguaDoDispositivo(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

/** Aplica a preferência guardada ('' = idioma do telemóvel). */
export function aplicarPreferenciaIdioma(preferencia: string) {
  definirIdioma(resolverIdioma(preferencia, linguaDoDispositivo()));
}
