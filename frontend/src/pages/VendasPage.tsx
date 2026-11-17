import { useEffect, useMemo, useRef, useState } from 'react';
import { CarFront, PackageCheck, Clock, Smartphone, UserX, Repeat } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { ChartContainer, ShadcnBarChart, ShadcnPieChart } from '../components/ui/Chart';
import { SkeletonKpis } from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import Filtros, { filtroInicial, type FiltroBase } from '../components/painel/Filtros';
import Kpi from '../components/painel/Kpi';
import FiltroAtivo from '../components/painel/FiltroAtivo';
import Paginacao from '../components/painel/Paginacao';
import ThOrdenavel, { semOrdem, type Ordem } from '../components/painel/ThOrdenavel';
import { UltimaAtualizacao } from '../components/layout/AppLayout';
import { callSF, SF } from '../lib/api';
import { fmtData, fmtDiaMes, fmtNum } from '../lib/format';
import { useSessao } from '../lib/sessao';
import Faixa from '../components/layout/Faixa';
import { getMitraErrorMessage } from '../lib/utils';

interface Linha { SECAO: string; NOME: string; QTD: number }
interface Venda {
  LOJA_CODIGO: string; LOJA_NOME: string; PROPOSTA: number; DATA_NF: string; CLIENTE: string; VENDEDOR: string | null;
  MARCA: string; MODELO: string; TIPO_VENDA: string; STATUS_ENTREGA: string; CADASTRO_APP: boolean | number; USADO_TROCA: boolean | number; TOTAL: number;
}

const TAMANHO = 20;
const RECORTES: Record<string, string> = {
  ENTREGUES: 'Entregues',
  PENDENTES: 'Entrega pendente',
  AGENDADAS: 'Entrega agendada',
  COM_APP: 'Compradores com app',
  SEM_APP: 'Compradores sem app',
  COM_TROCA: 'Com usado na troca',
};
const CRITERIO: Record<string, string> = {
  LOJA: 'vendas da loja 3.1 Premier Seminovos',
  VEICULO: 'veículos usados de todas as lojas',
  AMBOS: 'vendas da loja 3.1 e veículos usados das demais lojas',
};

function statusBadge(s: string) {
  if (s === 'Realizada' || s.startsWith('Baixada')) return <Badge variant="success">{s}</Badge>;
  if (s === 'Agendada') return <Badge variant="info">{s}</Badge>;
  return <Badge variant="warning">{s}</Badge>;
}

export default function VendasPage({ area }: { area: 'NOVOS' | 'SEMINOVOS' }) {
  const { lojas, params } = useSessao();
  const [filtro, setFiltro] = useState<FiltroBase>(filtroInicial);
  const [vendedor, setVendedor] = useState('');
  const [recorte, setRecorte] = useState('');
  const [dia, setDia] = useState('');
  const [marca, setMarca] = useState('');
  const [status, setStatus] = useState('');
  const [ordem, setOrdem] = useState<Ordem>(semOrdem);
  const listaRef = useRef<HTMLDivElement>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pagina, setPagina] = useState(0);
  const [erro, setErro] = useState('');
  const versao = useRef(0);

  const limparExtras = () => { setVendedor(''); setRecorte(''); setDia(''); setMarca(''); setStatus(''); setOrdem(semOrdem); };
  useEffect(() => { limparExtras(); setFiltro(filtroInicial()); }, [area]);

  const input = useMemo(() => ({
    area, ini: filtro.ini, fim: filtro.fim, lojas: filtro.lojas.join(','), tipos: filtro.tipos.join(','), vendedor,
  }), [area, filtro, vendedor]);

  useEffect(() => { setPagina(0); }, [input, recorte, dia, marca, status, ordem]);

  useEffect(() => {
    const v = ++versao.current;
    setErro('');
    Promise.all([
      callSF<Linha>(SF.vendasPainel, input),
      callSF<Venda>(SF.vendasLista, { ...input, recorte, dia, marca, status, ordem: ordem.coluna, dir: ordem.dir, limit: TAMANHO, offset: pagina * TAMANHO }),
    ]).then(([painel, lista]) => {
      if (v !== versao.current) return;
      setLinhas(painel);
      setVendas(lista);
    }).catch(e => { if (v === versao.current) setErro(getMitraErrorMessage(e)); });
  }, [input, pagina, recorte, dia, marca, status, ordem]);

  const secao = (s: string) => (linhas || []).filter(l => l.SECAO === s);
  const kpi = (n: string) => Number(secao('KPI').find(l => l.NOME === n)?.QTD || 0);
  const ranking = secao('VENDEDOR').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const totalRanking = ranking.reduce((s, r) => s + r.value, 0);
  const porDia = secao('DIA').map(l => ({ dia: l.NOME, name: fmtDiaMes(l.NOME), value: Number(l.QTD) })).sort((a, b) => a.dia.localeCompare(b.dia));
  const porLoja = secao('LOJA').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value);
  const porTipo = secao('TIPO').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value);
  const porStatus = secao('STATUS').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value);
  const porMarca = secao('MARCA').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const total = kpi('TOTAL');
  const idxVendedor = vendedor ? ranking.findIndex(r => r.name === vendedor) : -1;
  const idxDia = dia ? porDia.findIndex(d => d.dia === dia) : -1;
  const idxMarca = marca ? porMarca.findIndex(d => d.name === marca) : -1;
  const idxStatus = status ? porStatus.findIndex(d => d.name === status) : -1;
  const idxLoja = filtro.lojas.length === 1 ? porLoja.findIndex(d => lojas.find(l => l.id === filtro.lojas[0] && d.name.startsWith(l.codigo + ' '))) : -1;
  const idxTipo = filtro.tipos.length === 1 ? porTipo.findIndex(d => d.name === filtro.tipos[0]) : -1;
  const irParaLista = () => setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  const alternar = (set: (f: (v: string) => string) => void, valor: string) => { set(v => v === valor ? '' : valor); irParaLista(); };

  const clicarLoja = (item: { name: string }) => {
    const loja = lojas.find(l => item.name.startsWith(l.codigo + ' '));
    if (loja) setFiltro(f => ({ ...f, lojas: f.lojas.length === 1 && f.lojas[0] === loja.id ? [] : [loja.id] }));
  };
  const clicarTipo = (item: { name: string }) => setFiltro(f => ({ ...f, tipos: f.tipos.length === 1 && f.tipos[0] === item.name ? [] : [item.name] }));

  const verLista = (r: string) => {
    setRecorte(atual => atual === r ? '' : r);
    irParaLista();
  };
  const pct = (n: number) => total ? `${Math.round(n * 100 / total)}% das vendas` : undefined;

  const titulo = area === 'NOVOS' ? 'Novos' : 'Seminovos';
  const criterio = CRITERIO[params.CRITERIO_SEMINOVOS || 'LOJA'];

  return (
    <div className="flex flex-col gap-5">
      <Faixa
        sobretitulo={area === 'SEMINOVOS' ? 'Premier Seminovos' : 'Jeep · RAM · Kia'}
        titulo={titulo}
        carro={area === 'SEMINOVOS' ? 'compassPreto' : 'compassBranco'}
        descricao={<>
          Vendas pela data da nota fiscal (Agenda de Entrega do Movisis). Canceladas e devolvidas não contam.
          {' '}{area === 'SEMINOVOS' ? `Seminovos = ${criterio}.` : `Novos = todas as vendas fora de Seminovos (${criterio}).`}
        </>}
      >
        <UltimaAtualizacao />
      </Faixa>

      <Filtros
        valor={filtro} onChange={setFiltro} comTipo
        outrosAtivos={!!vendedor || !!recorte || !!dia || !!marca || !!status || ordem.dir !== ''}
        onLimpar={limparExtras}
      />
      {vendedor && (
        <div className="flex flex-wrap gap-2"><FiltroAtivo rotulo={`Vendedor: ${vendedor}`} onLimpar={() => setVendedor('')} /></div>
      )}

      {erro && <Card className="px-5 py-4 text-[13px] text-danger-text">Não foi possível carregar os dados: {erro}</Card>}

      {!linhas ? <SkeletonKpis count={6} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5" /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <Kpi rotulo="Vendas no período" valor={fmtNum(total)} icone={<CarFront size={16} />} nota={total === 0 ? 'Sem dados no período' : 'Ver todas na lista'} onClick={() => verLista('')} ativo={recorte === ''} />
            <Kpi rotulo="Entregues" valor={fmtNum(kpi('ENTREGUES'))} icone={<PackageCheck size={16} />} nota={pct(kpi('ENTREGUES'))} onClick={() => verLista('ENTREGUES')} ativo={recorte === 'ENTREGUES'} />
            <Kpi rotulo="A entregar" valor={fmtNum(kpi('A_ENTREGAR'))} icone={<Clock size={16} />} ativo={recorte === 'PENDENTES' || recorte === 'AGENDADAS'}>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={recorte === 'PENDENTES' ? 'primary' : 'secondary'} onClick={() => verLista('PENDENTES')}>Pendentes · {fmtNum(kpi('PENDENTES'))}</Button>
                <Button size="sm" variant={recorte === 'AGENDADAS' ? 'primary' : 'secondary'} onClick={() => verLista('AGENDADAS')}>Agendados · {fmtNum(kpi('AGENDADAS'))}</Button>
              </div>
            </Kpi>
            <Kpi rotulo="Compradores com app" valor={fmtNum(kpi('COM_APP'))} icone={<Smartphone size={16} />} nota={pct(kpi('COM_APP'))} onClick={() => verLista('COM_APP')} ativo={recorte === 'COM_APP'} />
            <Kpi rotulo="Compradores sem app" valor={fmtNum(kpi('SEM_APP'))} icone={<UserX size={16} />} nota={pct(kpi('SEM_APP'))} onClick={() => verLista('SEM_APP')} ativo={recorte === 'SEM_APP'} />
            <Kpi rotulo="Com usado na troca" valor={fmtNum(kpi('COM_TROCA'))} icone={<Repeat size={16} />} nota={pct(kpi('COM_TROCA'))} onClick={() => verLista('COM_TROCA')} ativo={recorte === 'COM_TROCA'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <div className="xl:col-span-2">
              <ChartContainer
                title="Ranking de vendedores"
                subtitle={`Quantidade de vendas · total ${fmtNum(totalRanking)} · clique para filtrar a tela`}
                action={vendedor ? <button type="button" className="text-[12.5px] underline text-fg-muted" onClick={() => setVendedor('')}>Limpar</button> : undefined}
              >
                {ranking.length ? (
                  <div className="max-h-[560px] overflow-y-auto pr-1">
                    <ShadcnBarChart
                      data={ranking} layout="vertical" bars={[{ dataKey: 'value', name: 'Vendas' }]} showLabel
                      activeIndex={idxVendedor >= 0 ? [idxVendedor] : undefined}
                      onBarClick={(_i, idx) => { const nome = ranking[idx]?.name; setVendedor(v => v === nome ? '' : nome || ''); }}
                      height={Math.max(200, ranking.length * 34)}
                    />
                  </div>
                ) : <Vazio />}
              </ChartContainer>
            </div>
            <div className="xl:col-span-3 flex flex-col gap-5">
              <ChartContainer title="Vendas por dia" subtitle="Data da nota fiscal · clique num dia para filtrar a lista">
                {porDia.length ? <ShadcnBarChart data={porDia} bars={[{ dataKey: 'value', name: 'Vendas' }]} showLabel height={240} activeIndex={idxDia >= 0 ? [idxDia] : undefined} onBarClick={item => alternar(setDia, item.dia)} /> : <Vazio />}
              </ChartContainer>
              <ChartContainer title="Vendas por loja" subtitle="Clique numa loja para filtrar">
                {porLoja.length ? <ShadcnBarChart data={porLoja} layout="vertical" bars={[{ dataKey: 'value', name: 'Vendas' }]} showLabel activeIndex={idxLoja >= 0 ? [idxLoja] : undefined} onBarClick={clicarLoja} /> : <Vazio />}
              </ChartContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartContainer title="Tipo de venda" subtitle="Clique para filtrar">
              {porTipo.length ? <ShadcnPieChart data={porTipo} showLabel labelType="percent" onSliceClick={clicarTipo} activeIndex={idxTipo >= 0 ? [idxTipo] : undefined} height={240} /> : <Vazio />}
            </ChartContainer>
            <ChartContainer title="Situação da entrega" subtitle="Clique para filtrar a lista">
              {porStatus.length ? <ShadcnPieChart data={porStatus} showLabel labelType="percent" height={240} activeIndex={idxStatus >= 0 ? [idxStatus] : undefined} onSliceClick={item => alternar(setStatus, item.name)} /> : <Vazio />}
            </ChartContainer>
            <ChartContainer title="Marcas mais vendidas" subtitle="Até 10 marcas · clique para filtrar a lista">
              {porMarca.length ? <ShadcnBarChart data={porMarca} layout="vertical" bars={[{ dataKey: 'value', name: 'Vendas' }]} showLabel activeIndex={idxMarca >= 0 ? [idxMarca] : undefined} onBarClick={item => alternar(setMarca, item.name)} /> : <Vazio />}
            </ChartContainer>
          </div>

          <div ref={listaRef} className="scroll-mt-4">
          <Card className="py-5">
            <CardHeader
              className="px-5 pb-4"
              action={(recorte || dia || marca || status) ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {recorte && <FiltroAtivo rotulo={RECORTES[recorte]} onLimpar={() => setRecorte('')} />}
                  {dia && <FiltroAtivo rotulo={`Dia: ${fmtData(dia)}`} onLimpar={() => setDia('')} />}
                  {status && <FiltroAtivo rotulo={`Entrega: ${status}`} onLimpar={() => setStatus('')} />}
                  {marca && <FiltroAtivo rotulo={`Marca: ${marca}`} onLimpar={() => setMarca('')} />}
                </div>
              ) : undefined}
            >
              <CardTitle>{recorte ? `Vendas do período · ${RECORTES[recorte]}` : 'Vendas do período'}</CardTitle>
              <CardDescription>Da nota fiscal mais recente para a mais antiga · clique num indicador ou gráfico para filtrar e num título de coluna para ordenar</CardDescription>
            </CardHeader>
            {vendas.length ? (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead><tr>
                    {([['DATA_NF', 'Nota fiscal'], ['LOJA', 'Loja'], ['PROPOSTA', 'Proposta'], ['CLIENTE', 'Cliente'], ['VENDEDOR', 'Vendedor'], ['VEICULO', 'Veículo'], ['TIPO', 'Tipo'], ['APP', 'App'], ['TROCA', 'Troca'], ['ENTREGA', 'Entrega']] as const).map(([c, t]) => (
                      <ThOrdenavel key={c} coluna={c} ordem={ordem} onOrdem={setOrdem}>{t}</ThOrdenavel>
                    ))}
                  </tr></thead>
                  <tbody>
                    {vendas.map(v => (
                      <tr key={v.LOJA_CODIGO + '-' + v.PROPOSTA}>
                        <td className="tabular-nums">{fmtData(v.DATA_NF)}</td>
                        <td>{v.LOJA_CODIGO}</td>
                        <td className="tabular-nums">{v.PROPOSTA}</td>
                        <td className="max-w-[240px] truncate" title={v.CLIENTE}>{v.CLIENTE}</td>
                        <td>{v.VENDEDOR || '—'}</td>
                        <td className="max-w-[240px] truncate" title={v.MODELO}>{v.MARCA} {v.MODELO}</td>
                        <td>{v.TIPO_VENDA}</td>
                        <td>{v.CADASTRO_APP ? 'Sim' : 'Não'}</td>
                        <td>{v.USADO_TROCA ? 'Sim' : 'Não'}</td>
                        <td>{statusBadge(v.STATUS_ENTREGA || '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="px-5"><Vazio /></div>}
            <Paginacao pagina={pagina} tamanho={TAMANHO} total={Number(vendas[0]?.TOTAL || 0)} onPagina={setPagina} />
          </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function Vazio() {
  return <div className="py-10 text-center text-[13px] text-fg-subtle">Sem dados no período</div>;
}
