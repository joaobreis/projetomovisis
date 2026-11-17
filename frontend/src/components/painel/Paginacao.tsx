import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import { fmtNum } from '../../lib/format';

export default function Paginacao({ pagina, tamanho, total, onPagina }: { pagina: number; tamanho: number; total: number; onPagina: (p: number) => void }) {
  if (total <= tamanho) return null;
  const ultima = Math.max(0, Math.ceil(total / tamanho) - 1);
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 text-[13px] text-fg-muted">
      <span>{fmtNum(pagina * tamanho + 1)} a {fmtNum(Math.min(total, (pagina + 1) * tamanho))} de {fmtNum(total)}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={pagina === 0} onClick={() => onPagina(pagina - 1)}><ChevronLeft size={16} /> Anterior</Button>
        <Button variant="secondary" size="sm" disabled={pagina >= ultima} onClick={() => onPagina(pagina + 1)}>Próxima <ChevronRight size={16} /></Button>
      </div>
    </div>
  );
}
