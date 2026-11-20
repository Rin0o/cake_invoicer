import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { hojeIso, isoParaData } from '@/domain/format';

/**
 * Abre o calendário do Android. Devolve a data escolhida ("aaaa-mm-dd"), `null` se carregar em
 * "Sem data", ou `undefined` se cancelar.
 */
export function escolherData(atual: string | null): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: isoParaData(atual),
      mode: 'date',
      firstDayOfWeek: 1, // segunda-feira
      positiveButton: { label: 'OK' },
      negativeButton: { label: 'Cancelar' },
      ...(atual ? { neutralButton: { label: 'Sem data' } } : {}),
      onValueChange: (_e, data) => resolve(hojeIso(data)),
      onNeutralButtonPress: () => resolve(null),
      onDismiss: () => resolve(undefined),
      onError: () => resolve(undefined),
    });
  });
}
