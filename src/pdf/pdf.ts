/**
 * Gera o PDF do orçamento (expo-print) e abre a folha de partilha.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { htmlOrcamento, nomeFicheiroPdf, type DadosPdf } from './template';

/** A4 a 72 ppp. */
const A4 = { width: 595, height: 842 };

/** `cliente` só é usado no nome do ficheiro; não aparece no PDF. */
export async function partilharPdf(dados: DadosPdf, cliente: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('A partilha de ficheiros não está disponível neste dispositivo.');
  }
  const html = htmlOrcamento(dados);
  // O ficheiro criado pelo expo-print tem um nome aleatório e o expo-file-system não tem
  // permissão para o mover ("Missing 'READ' permission"). Por isso pede-se o PDF em base64 e
  // grava-se um ficheiro próprio, com um nome legível para o cliente.
  const { base64 } = await Print.printToFileAsync({ html, base64: true, ...A4 });
  if (!base64) throw new Error('Não foi possível gerar o PDF.');

  const dir = new Directory(Paths.cache, 'pdf');
  if (!dir.exists) dir.create({ intermediates: true });
  const destino = new File(dir, nomeFicheiroPdf(dados.numero, cliente));
  destino.create({ overwrite: true });
  await destino.write(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

  await Sharing.shareAsync(destino.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Enviar orçamento',
  });
}
