/**
 * Idioma da app. Um só idioma para tudo (ecrãs, PDF, texto para o cliente), guardado em
 * `definicoes.idioma`. Módulo puro: o idioma do telemóvel é lido em `dispositivo.ts`.
 *
 * O idioma atual é global: `textos()` devolve o dicionário dele. Ao mudar, o `_layout.tsx` da
 * raiz volta a montar a navegação, para todos os ecrãs se desenharem de novo (com o React
 * Compiler, um componente podia guardar um texto ou preço já formatado no idioma antigo).
 */
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt, type Textos } from './pt';

export type { Textos };

export const IDIOMAS = ['pt', 'en', 'es', 'fr'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Nome de cada idioma na própria língua (para quem não percebe o idioma atual o encontrar). */
export const NOME_IDIOMA: Record<Idioma, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

const DICIONARIOS: Record<Idioma, Textos> = { pt, en, es, fr };

/** Idioma quando o do telemóvel não é nenhum dos da app. */
export const IDIOMA_DE_RECURSO: Idioma = 'en';

export function ehIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor);
}

/**
 * Idioma a usar. `preferencia` é o valor guardado ('' = automático); `dispositivo` é o código
 * de língua do telemóvel ("pt", "en-GB"…), se se souber.
 */
export function resolverIdioma(preferencia: string, dispositivo: string | null | undefined): Idioma {
  if (ehIdioma(preferencia)) return preferencia;
  const lingua = dispositivo?.trim().toLowerCase().slice(0, 2);
  return ehIdioma(lingua) ? lingua : IDIOMA_DE_RECURSO;
}

let atual: Idioma = 'pt';
const ouvintes = new Set<() => void>();

export function idiomaAtual(): Idioma {
  return atual;
}

/** Textos do idioma atual. */
export function textos(): Textos {
  return DICIONARIOS[atual];
}

export function textosDe(idioma: Idioma): Textos {
  return DICIONARIOS[idioma];
}

export function definirIdioma(idioma: Idioma) {
  if (idioma === atual) return;
  atual = idioma;
  for (const f of ouvintes) f();
}

/** Para `useSyncExternalStore`. Devolve a função para deixar de ouvir. */
export function subscreverIdioma(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/**
 * Nome por omissão de um bolo novo, em qualquer idioma ("Bolo 2", "Cake 2"…). Serve para saber se
 * o nome ainda não foi mudado, mesmo que o bolo tenha sido criado noutro idioma.
 */
export function ehNomePorOmissaoBolo(nome: string): boolean {
  const m = /^(.+) \d+$/.exec(nome);
  return !!m && IDIOMAS.some((i) => DICIONARIOS[i].bolo.prefixoNome === m[1]);
}
