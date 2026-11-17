import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface Props {
  rotulo: string;
  valor: string;
  nota?: ReactNode;
  icone?: ReactNode;
  onClick?: () => void;
  ativo?: boolean;
  children?: ReactNode;
}

export default function Kpi({ rotulo, valor, nota, icone, onClick, ativo, children }: Props) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] text-fg-muted">{rotulo}</span>
        <span className={ativo ? 'text-brand' : 'text-fg-subtle'}>{icone}</span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums text-fg">{valor}</div>
      {nota && <div className="mt-1.5 text-[12.5px] text-fg-subtle">{nota}</div>}
    </>
  );
  return (
    <Card className={`px-5 py-5 h-full ${ativo ? 'border-brand-border bg-brand-soft' : ''}`}>
      {onClick ? (
        <button type="button" onClick={onClick} aria-pressed={ativo} className="block w-full text-left cursor-pointer" title="Clique para ver na lista">
          {conteudo}
        </button>
      ) : conteudo}
      {children}
    </Card>
  );
}
