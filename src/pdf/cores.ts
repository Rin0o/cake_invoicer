/**
 * Cores do PDF. Cada opção é um conjunto de quatro cores que combinam entre si; na base de
 * dados guarda-se só o id (`definicoes.pdf_cor`), por isso afinar um tom aqui muda todos os PDF.
 *
 * Todas as cores `principal`, `texto` e `secundaria` têm contraste ≥ 4,5:1 sobre branco
 * (testado em cores.test.ts). `linhas` é decorativa e fica de fora.
 */
export interface CoresPdf {
  /** Título, nome do negócio, total e linha do total. */
  principal: string;
  /** Nomes dos bolos, número e datas. */
  texto: string;
  /** Rótulos, cabeçalho da tabela e rodapé. */
  secundaria: string;
  /** Separadores entre os bolos. */
  linhas: string;
}

export interface OpcaoCor extends CoresPdf {
  id: string;
  nome: string;
}

export const CORES_PDF: readonly OpcaoCor[] = [
  // A framboesa mantém as cores que o PDF tinha até à versão 0.2.
  { id: 'framboesa', nome: 'Framboesa', principal: '#A63D6B', texto: '#2B151C', secundaria: '#74565F', linhas: '#F2DDE1' },
  { id: 'coral', nome: 'Coral', principal: '#B8483A', texto: '#2B1917', secundaria: '#6D5755', linhas: '#F0E2E0' },
  { id: 'terracota', nome: 'Terracota', principal: '#9C5130', texto: '#2B1D17', secundaria: '#6D5C55', linhas: '#F0E5E0' },
  { id: 'salva', nome: 'Verde-salva', principal: '#4A6E50', texto: '#1D251F', secundaria: '#5C665E', linhas: '#E5EBE6' },
  { id: 'petroleo', nome: 'Azul-petróleo', principal: '#1D6872', texto: '#17292B', secundaria: '#556A6D', linhas: '#E0EEF0' },
  { id: 'marinho', nome: 'Azul-marinho', principal: '#24406E', texto: '#171F2B', secundaria: '#555E6D', linhas: '#E0E6F0' },
  { id: 'lilas', nome: 'Lilás', principal: '#6F4D9B', texto: '#201A28', secundaria: '#605969', linhas: '#E7E3ED' },
  { id: 'grafite', nome: 'Grafite', principal: '#3D434A', texto: '#1F2123', secundaria: '#5F6163', linhas: '#E5E8EB' },
];

/** Cor de quem instala a app pela primeira vez (igual ao DEFAULT da coluna, migração v4). */
export const COR_PDF_POR_OMISSAO = 'marinho';

/** A opção com este id; um id desconhecido (ex.: de uma versão mais recente) dá a cor por omissão. */
export function corPdf(id: string): OpcaoCor {
  return CORES_PDF.find((c) => c.id === id) ?? CORES_PDF.find((c) => c.id === COR_PDF_POR_OMISSAO)!;
}
