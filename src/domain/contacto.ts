/**
 * Dados de um contacto do telemóvel para preencher o cliente de um orçamento.
 * Puro: o acesso aos contactos está em `src/ui/EscolherContacto.tsx`.
 */

export interface TelefoneContacto {
  number?: string;
  label?: string;
}

export interface EmailContacto {
  address?: string;
  label?: string;
}

/** Uma forma de contactar o cliente, para escolher quando o contacto tem várias. */
export interface OpcaoContacto {
  tipo: 'telefone' | 'email';
  valor: string;
  /** Ex.: "Telemóvel", "Email · Trabalho". */
  rotulo: string;
}

const ROTULOS: Record<string, string> = {
  mobile: 'Telemóvel',
  home: 'Casa',
  work: 'Trabalho',
  other: 'Outro',
  main: 'Principal',
  faxwork: 'Fax (trabalho)',
  faxhome: 'Fax (casa)',
  pager: 'Pager',
  workmobile: 'Telemóvel (trabalho)',
};

/** Traduz a etiqueta do Android; etiquetas personalizadas ficam como estão. */
export function rotuloEtiqueta(label: string | undefined): string | null {
  const l = label?.trim();
  if (!l) return null;
  return ROTULOS[l.toLowerCase()] ?? l;
}

/** Para comparar números iguais escritos de formas diferentes ("912 345 678" e "912345678"). */
function chaveTelefone(n: string) {
  return n.replace(/[\s().-]/g, '');
}

/**
 * Telefones primeiro, depois emails; sem vazios nem repetidos.
 * Os números ficam como estão no contacto (só sem espaços nas pontas).
 */
export function opcoesContacto(telefones: TelefoneContacto[], emails: EmailContacto[]): OpcaoContacto[] {
  const opcoes: OpcaoContacto[] = [];
  const vistos = new Set<string>();

  for (const t of telefones) {
    const valor = t.number?.trim();
    if (!valor) continue;
    const chave = chaveTelefone(valor);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    opcoes.push({ tipo: 'telefone', valor, rotulo: rotuloEtiqueta(t.label) ?? 'Telefone' });
  }

  for (const e of emails) {
    const valor = e.address?.trim();
    if (!valor) continue;
    const chave = valor.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const etiqueta = rotuloEtiqueta(e.label);
    opcoes.push({ tipo: 'email', valor, rotulo: etiqueta ? `Email · ${etiqueta}` : 'Email' });
  }

  return opcoes;
}
