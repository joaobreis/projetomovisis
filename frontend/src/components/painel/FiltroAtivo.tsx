import { X } from 'lucide-react';

export default function FiltroAtivo({ rotulo, onLimpar }: { rotulo: string; onLimpar: () => void }) {
  return (
    <span className="pilula pilula-acento gap-1.5">
      {rotulo}
      <button type="button" onClick={onLimpar} aria-label={`Remover filtro ${rotulo}`} className="inline-flex"><X size={14} /></button>
    </span>
  );
}
