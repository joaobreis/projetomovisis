export const TIPOS_CASHBACK = [
  { codigo: 'GERADO', nome: 'Gerado', nota: 'Cashback gerado no período' },
  { codigo: 'RESGATADO', nome: 'Resgatado', nota: 'Usado pelos clientes' },
  { codigo: 'DISPONIVEL', nome: 'Disponível', nota: 'Saldo que ainda pode ser usado' },
  { codigo: 'EXPIRA_30', nome: 'Expira em 30 dias', nota: 'Saldo que vence nos próximos 30 dias' },
  { codigo: 'EXPIRADO', nome: 'Expirado', nota: 'Venceu sem uso' },
  { codigo: 'AVULSO', nome: 'Avulso', nota: 'Créditos lançados à mão' },
] as const;

export type TipoCashback = typeof TIPOS_CASHBACK[number]['codigo'];

export interface LinhaCashback {
  chave: string; loja: string | null; contato: number | null; cliente: number | null; nome: string | null; telefone: string | null;
  emissao: string | null; servicos: number | null; mercadorias: number | null; valor: number | null; utilizado: number | null; saldo: number | null;
  origem: string | null; situacao: string | null; validade: string | null; resgate: string | null; responsavel: string | null;
  observacao: string | null; empresa: string | null;
}

export interface ResultadoParse { linhas: LinhaCashback[]; ignoradas: number; camposReconhecidos: string[]; camposDesconhecidos: string[] }

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const CAMPOS: Record<keyof Omit<LinhaCashback, 'chave'>, string[]> = {
  loja: ['loja', 'codigoloja', 'codloja', 'lojacodigo', 'filial', 'codigofilial', 'codfilial', 'empresaloja', 'revenda', 'codrevenda'],
  contato: ['contato', 'codigocontato', 'codcontato', 'numerocontato', 'nrocontato', 'idcontato'],
  cliente: ['cliente', 'codigocliente', 'codcliente', 'idcliente', 'clienteid', 'codigo'],
  nome: ['nomecliente', 'nome', 'clientenome', 'razaosocial', 'nomerazaosocial'],
  telefone: ['telefone', 'fone', 'celular', 'telefonecelular', 'telefonecliente'],
  emissao: ['dataemissao', 'emissao', 'data', 'datacontato', 'datageracao', 'datacadastro', 'datalancamento'],
  servicos: ['totalservicos', 'servicos', 'valorservicos'],
  mercadorias: ['totalmercadorias', 'mercadorias', 'valormercadorias', 'totalpecas'],
  valor: ['valorcashback', 'cashback', 'valor', 'valorbonus', 'valorcredito', 'credito'],
  utilizado: ['cashbackutilizado', 'utilizado', 'valorutilizado', 'valorresgatado', 'resgatado'],
  saldo: ['saldocashback', 'saldo', 'saldodisponivel', 'valordisponivel'],
  origem: ['origem', 'origemcashback', 'tipo', 'tipocashback'],
  situacao: ['situacaobonus', 'situacao', 'status', 'statusbonus'],
  validade: ['datavalidade', 'validade', 'datavencimento', 'vencimento', 'dataexpiracao'],
  resgate: ['dataresgate', 'resgate', 'datautilizacao'],
  responsavel: ['usuarioresponsavel', 'responsavel', 'usuario', 'vendedor'],
  observacao: ['observacao', 'obs', 'observacoes', 'historico'],
  empresa: ['nomeempresa', 'empresa', 'razaoempresa'],
};
const NUMEROS = new Set(['contato', 'cliente', 'servicos', 'mercadorias', 'valor', 'utilizado', 'saldo']);
const DATAS = new Set(['emissao', 'validade', 'resgate']);

function acharLista(dado: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(dado)) return dado.filter(x => x && typeof x === 'object') as Record<string, unknown>[];
  if (dado && typeof dado === 'object') {
    const obj = dado as Record<string, unknown>;
    for (const k of ['Data', 'data', 'Dados', 'dados', 'Items', 'items', 'Registros', 'registros', 'Result', 'result', 'rows']) {
      if (Array.isArray(obj[k])) return acharLista(obj[k]);
    }
    for (const v of Object.values(obj)) {
      const l = acharLista(v);
      if (l && l.length) return l;
    }
  }
  return null;
}

function numero(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/R\$|\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function data(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function texto(v: unknown): string | null {
  if (v == null) return null;
  const s = Array.from(String(v), ch => (ch.charCodeAt(0) < 32 || ch === '\\' ? ' ' : ch)).join('').replace(/'/g, '’').replace(/"/g, '”').replace(/\s+/g, ' ').trim();
  return s ? s : null;
}

/** Lê o JSON colado do Movisis e devolve as linhas no formato que a importação grava. */
export function lerJsonCashback(conteudo: string): ResultadoParse {
  const dado = JSON.parse(conteudo);
  const lista = acharLista(dado);
  if (!lista || !lista.length) throw new Error('Não encontrei uma lista de registros no JSON.');

  const chavesOriginais = Array.from(new Set(lista.slice(0, 50).flatMap(o => Object.keys(o))));
  const mapa: Partial<Record<keyof typeof CAMPOS, string>> = {};
  const usadas = new Set<string>();
  for (const campo of Object.keys(CAMPOS) as (keyof typeof CAMPOS)[]) {
    for (const candidato of CAMPOS[campo]) {
      const achada = chavesOriginais.find(k => !usadas.has(k) && normalizar(k) === candidato);
      if (achada) { mapa[campo] = achada; usadas.add(achada); break; }
    }
  }

  const repeticoes = new Map<string, number>();
  const linhas: LinhaCashback[] = [];
  let ignoradas = 0;
  for (const o of lista) {
    const valorDe = (campo: keyof typeof CAMPOS) => {
      const k = mapa[campo];
      const v = k ? o[k] : undefined;
      if (NUMEROS.has(campo)) return numero(v);
      if (DATAS.has(campo)) return data(v);
      return texto(v);
    };
    const l = Object.fromEntries((Object.keys(CAMPOS) as (keyof typeof CAMPOS)[]).map(c => [c, valorDe(c)])) as Omit<LinhaCashback, 'chave'>;
    if (l.contato != null) l.contato = Math.trunc(l.contato);
    if (l.cliente != null) l.cliente = Math.trunc(l.cliente);
    if (!l.loja || (l.contato == null && l.cliente == null && !l.nome)) { ignoradas++; continue; }
    let chave: string;
    if (l.contato != null) {
      const base = `${l.loja}|${l.contato}`;
      const n = (repeticoes.get(base) || 0) + 1;
      repeticoes.set(base, n);
      chave = n === 1 ? base : `${base}#${n}`;
    } else {
      chave = `${l.loja}|${l.cliente ?? l.nome}|${l.emissao ?? ''}|${l.valor ?? ''}|${l.validade ?? ''}`;
    }
    linhas.push({ chave: chave.slice(0, 120), ...l });
  }

  return {
    linhas,
    ignoradas,
    camposReconhecidos: Object.values(mapa) as string[],
    camposDesconhecidos: chavesOriginais.filter(k => !usadas.has(k)),
  };
}
