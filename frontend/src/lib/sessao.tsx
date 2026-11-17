import { createContext, useContext } from 'react';

export interface Area { codigo: string; nome: string; disponivel: boolean; liberada: boolean; ordem: number }
export interface Loja { id: string; nome: string; codigo: string; temOficina: boolean; grupo: string }
export interface Atualizacao { fim: string | null; status: string; lojasFalha: string; detalhe?: string | null }

export interface Sessao {
  email: string;
  diretor: boolean;
  dev: boolean;
  areas: Area[];
  lojas: Loja[];
  tipos: string[];
  params: Record<string, string>;
  ultimaOk: Atualizacao | null;
  ultima: Atualizacao | null;
  recarregar: () => void;
}

export const SessaoContext = createContext<Sessao | null>(null);

export function useSessao(): Sessao {
  const s = useContext(SessaoContext);
  if (!s) throw new Error('Sessão não carregada');
  return s;
}

export const ROTA_AREA: Record<string, string> = {
  NOVOS: '/novos',
  SEMINOVOS: '/seminovos',
  OFICINA: '/oficina',
  PECAS: '/pecas',
  FINANCEIRO: '/financeiro',
};
