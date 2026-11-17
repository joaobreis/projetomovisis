export const fmtNum = (v: number) => Number(v || 0).toLocaleString('pt-BR');
export const fmtBrl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function isoHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoInicioMes(): string {
  return isoHoje().slice(0, 8) + '01';
}

export function fmtData(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDiaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function fmtDataHora(iso?: string | null): string {
  if (!iso) return '—';
  return `${fmtData(iso)} às ${iso.slice(11, 16)}`;
}

/** Moeda curta para rótulo de gráfico: R$ 1,2 mi · R$ 35 mil · R$ 820 */
export function fmtBrlCurto(v: number): string {
  const n = Number(v || 0);
  const a = Math.abs(n);
  if (a >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1_000) return `R$ ${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: a >= 10_000 ? 0 : 1 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export function fmtMesAno(aaaamm: string): string {
  const [y, m] = aaaamm.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[Number(m) - 1] || m}/${y.slice(2)}`;
}
