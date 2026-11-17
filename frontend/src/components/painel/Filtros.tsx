import DatePicker from '../ui/DatePicker';
import MultiSelect from '../ui/MultiSelect';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useSessao } from '../../lib/sessao';
import { isoHoje, isoInicioMes } from '../../lib/format';

export interface FiltroBase { ini: string; fim: string; lojas: string[]; tipos: string[] }

export function filtroInicial(): FiltroBase {
  return { ini: isoInicioMes(), fim: isoHoje(), lojas: [], tipos: [] };
}

interface Props {
  valor: FiltroBase;
  onChange: (f: FiltroBase) => void;
  soOficina?: boolean;
  comTipo?: boolean;
  semPeriodo?: boolean;
  /** Filtro de partida da tela (o "Limpar filtros" volta para ele). Padrão: mês atual, todas as lojas. */
  padrao?: FiltroBase;
  /** A tela tem outros filtros ligados (gráfico clicado, recorte, ordem da lista). */
  outrosAtivos?: boolean;
  /** Limpa os filtros próprios da tela; o período e as lojas voltam ao padrão aqui mesmo. */
  onLimpar?: () => void;
}

function igual(a: FiltroBase, b: FiltroBase) {
  return a.ini === b.ini && a.fim === b.fim && a.lojas.join() === b.lojas.join() && a.tipos.join() === b.tipos.join();
}

export default function Filtros({ valor, onChange, soOficina, comTipo, semPeriodo, padrao, outrosAtivos, onLimpar }: Props) {
  const base = padrao ?? filtroInicial();
  const algumAtivo = !igual(valor, base) || !!outrosAtivos;
  const { lojas, tipos } = useSessao();
  const opcoesLojas = lojas.filter(l => !soOficina || l.temOficina).map(l => ({ value: l.id, label: `${l.codigo} ${l.nome}` }));
  const atalhos = [
    { rotulo: 'Hoje', ini: isoHoje(), fim: isoHoje() },
    { rotulo: 'Mês atual', ini: isoInicioMes(), fim: isoHoje() },
    { rotulo: 'Mês anterior', ...mesAnterior() },
  ];
  return (
    <div className="flex flex-wrap items-end gap-3">
      {!semPeriodo && (
        <>
          <div className="w-40"><DatePicker label="Data inicial" value={valor.ini} onChange={v => v && onChange({ ...valor, ini: v })} /></div>
          <div className="w-40"><DatePicker label="Data final" value={valor.fim} onChange={v => v && onChange({ ...valor, fim: v })} /></div>
        </>
      )}
      <div className="w-64">
        <MultiSelect label="Lojas" options={opcoesLojas} values={valor.lojas} onChange={v => onChange({ ...valor, lojas: v })} allLabel="Todas as lojas" />
      </div>
      {comTipo && (
        <div className="w-56">
          <MultiSelect label="Tipo de venda" options={tipos.map(t => ({ value: t, label: t }))} values={valor.tipos} onChange={v => onChange({ ...valor, tipos: v })} allLabel="Todos os tipos" />
        </div>
      )}
      {!semPeriodo && (
        <div className="flex gap-1">
          {atalhos.map(a => (
            <Button
              key={a.rotulo}
              variant={valor.ini === a.ini && valor.fim === a.fim ? 'secondary' : 'ghost'}
              aria-pressed={valor.ini === a.ini && valor.fim === a.fim}
              onClick={() => valor.ini === a.ini && valor.fim === a.fim
                ? onChange({ ...valor, ini: base.ini, fim: base.fim })
                : onChange({ ...valor, ini: a.ini, fim: a.fim })}
            >
              {a.rotulo}
            </Button>
          ))}
        </div>
      )}
      {algumAtivo && (
        <Button variant="ghost" onClick={() => { onChange(base); onLimpar?.(); }}>
          <X size={16} /> Limpar filtros
        </Button>
      )}
    </div>
  );
}

function mesAnterior() {
  const d = new Date();
  const ini = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const fim = new Date(d.getFullYear(), d.getMonth(), 0);
  const f = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { ini: f(ini), fim: f(fim) };
}
