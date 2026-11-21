import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { hojeIso, isoParaData } from '@/domain/format';
import { textos } from '@/i18n';

/**
 * Abre o calendário do Android. Devolve a data escolhida ("aaaa-mm-dd"), `null` se carregar em
 * "Sem data", ou `undefined` se cancelar.
 */
export function escolherData(atual: string | null): Promise<string | null | undefined> {
  const t = textos();
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: isoParaData(atual),
      mode: 'date',
      firstDayOfWeek: 1, // segunda-feira
      positiveButton: { label: t.calendario.ok },
      negativeButton: { label: t.comum.cancelar },
      ...(atual ? { neutralButton: { label: t.calendario.semData } } : {}),
      onValueChange: (_e, data) => resolve(hojeIso(data)),
      onNeutralButtonPress: () => resolve(null),
      onDismiss: () => resolve(undefined),
      onError: () => resolve(undefined),
    });
  });
}
