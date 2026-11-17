import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type Dir = '' | 'ASC' | 'DESC';
export interface Ordem { coluna: string; dir: Dir }
export const semOrdem: Ordem = { coluna: '', dir: '' };

/** Clique alterna: crescente, decrescente e volta à ordem padrão da lista. */
export function proximaOrdem(atual: Ordem, coluna: string): Ordem {
  if (atual.coluna !== coluna || atual.dir === '') return { coluna, dir: 'ASC' };
  if (atual.dir === 'ASC') return { coluna, dir: 'DESC' };
  return semOrdem;
}

export default function ThOrdenavel({ coluna, ordem, onOrdem, children, className = '' }: {
  coluna: string; ordem: Ordem; onOrdem: (o: Ordem) => void; children: string; className?: string;
}) {
  const ativa = ordem.coluna === coluna && ordem.dir !== '';
  const Icone = !ativa ? ArrowUpDown : ordem.dir === 'ASC' ? ArrowUp : ArrowDown;
  return (
    <th className={className} aria-sort={!ativa ? 'none' : ordem.dir === 'ASC' ? 'ascending' : 'descending'}>
      <button
        type="button"
        onClick={() => onOrdem(proximaOrdem(ordem, coluna))}
        className={`inline-flex items-center gap-1 ${className.includes('text-right') ? 'flex-row-reverse' : ''} ${ativa ? 'text-fg' : ''}`}
        title="Clique para ordenar"
      >
        {children}
        <Icone size={12} className={ativa ? '' : 'opacity-40'} />
      </button>
    </th>
  );
}
