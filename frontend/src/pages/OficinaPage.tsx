import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, CheckCircle2, Wallet, Timer, AlertTriangle, Smartphone, Users, UserX } from 'lucide-react';
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
import { Vazio } from './VendasPage';
import { callSF, SF } from '../lib/api';
import { fmtBrl, fmtData, fmtDiaMes, fmtNum } from '../lib/format';
import { useSessao } from '../lib/sessao';
import Faixa from '../components/layout/Faixa';
import { getMitraErrorMessage } from '../lib/utils';

interface Linha { SECAO: string; NOME: string; QTD: number }
interface Os {
  LOJA_NOME: string; NRO_OS: number; CLIENTE: string; CONSULTOR: string | null; DATA_ABERTURA: string; DATA_ENCERRAMENTO: string | null;
  SITUACAO: string | null; EM_ANDAMENTO: boolean | number; DIAS_ABERTA: number;
  TOTAL_OS: number; MODELO: string; PLACA: string; CATEGORIA: string; VIA_APP: boolean | number; TOTAL: number;
}
interface Comprador { CLIENTE: string; APP: string | boolean | number | null; COMPRAS: number; ULTIMA_COMPRA: string; LOJAS: string; VEICULO: string; TOTAL: number }

const TAMANHO = 20;
const PADRAO = 'ATRASADAS';

const TITULOS: Record<string, { titulo: string; descricao: string }> = {
  ATRASADAS: { titulo: 'OS abertas há mais de 30 dias', descricao: 'Não encerradas, situação de agora' },
  ABERTAS: { titulo: 'OS abertas no período', descricao: 'Pela data de abertura' },
  ENCERRADAS: { titulo: 'OS encerradas no período', descricao: 'Pela data de encerramento' },
  EM_ANDAMENTO: { titulo: 'OS em andamento agora', descricao: 'Ainda não encerradas' },
  VIA_APP: { titulo: 'OS agendadas pelo app', descricao: 'Abertas no período com o campo Via App' },
  COM_APP: { titulo: 'Compradores de veículo com o app', descricao: 'Clientes que compraram veículo no período e têm o app' },
  SEM_APP: { titulo: 'Compradores de veículo sem o app', descricao: 'Clientes que compraram veículo no período e não têm o app' },
};

export default function OficinaPage() {
  const { lojas } = useSessao();
  const [filtro, setFiltro] = useState<FiltroBase>(filtroInicial);
  const [consultor, setConsultor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dia, setDia] = useState('');
  const [recorte, setRecorte] = useState(PADRAO);
  const [ordem, setOrdem] = useState<Ordem>(semOrdem);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [lista, setLista] = useState<Os[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [pagina, setPagina] = useState(0);
  const [erro, setErro] = useState('');
  const versao = useRef(0);
  const listaRef = useRef<HTMLDivElement>(null);

  const ehCompradores = recorte === 'COM_APP' || recorte === 'SEM_APP';
  const input = useMemo(() => ({ ini: filtro.ini, fim: filtro.fim, lojas: filtro.lojas.join(','), consultor, categoria }), [filtro, consultor, categoria]);

  useEffect(() => { setPagina(0); }, [input, recorte, dia, ordem]);

  useEffect(() => {
    const v = ++versao.current;
    setErro('');
    const paginacao = { limit: TAMANHO, offset: pagina * TAMANHO, ordem: ordem.coluna, dir: ordem.dir };
    const pedidoLista: Promise<Os[] | Comprador[]> = ehCompradores
      ? callSF<Comprador>(SF.oficinaCompradores, { ini: input.ini, fim: input.fim, lojas: input.lojas, recorte, ...paginacao })
      : callSF<Os>(SF.oficinaAtrasadas, { ...input, recorte: recorte === PADRAO ? '' : recorte, dia, ...paginacao });
    Promise.all([callSF<Linha>(SF.oficinaPainel, input), pedidoLista]).then(([painel, itens]) => {
      if (v !== versao.current) return;
      setLinhas(painel);
      if (ehCompradores) setCompradores(itens as Comprador[]); else setLista(itens as Os[]);
    }).catch(e => { if (v === versao.current) setErro(getMitraErrorMessage(e)); });
  }, [input, pagina, recorte, dia, ordem, ehCompradores]);

  const secao = (s: string) => (linhas || []).filter(l => l.SECAO === s);
  const kpi = (n: string) => Number(secao('KPI').find(l => l.NOME === n)?.QTD || 0);
  const porConsultor = secao('CONSULTOR').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const porCategoria = secao('CATEGORIA').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const porLoja = secao('LOJA').map(l => ({ name: l.NOME, value: Number(l.QTD) })).sort((a, b) => b.value - a.value);
  const porDia = secao('DIA').map(l => ({ dia: l.NOME, name: fmtDiaMes(l.NOME), value: Number(l.QTD) })).sort((a, b) => a.dia.localeCompare(b.dia));
  const porFaixa = secao('FAIXA').map(l => { const [ordemFaixa, rotulo] = l.NOME.split('|'); return { ordem: Number(ordemFaixa), name: rotulo, value: Number(l.QTD) }; }).sort((a, b) => a.ordem - b.ordem);
  const idxConsultor = consultor ? porConsultor.findIndex(r => r.name === consultor) : -1;
  const idxCategoria = categoria ? porCategoria.findIndex(r => r.name === categoria) : -1;
  const idxDia = dia ? porDia.findIndex(d => d.dia === dia) : -1;
  const idxFaixa = recorte.startsWith('FAIXA') ? porFaixa.findIndex(f => `FAIXA${f.ordem}` === recorte) : -1;
  const idxLoja = filtro.lojas.length === 1 ? porLoja.findIndex(d => lojas.find(l => l.id === filtro.lojas[0])?.nome === d.name) : -1;
  const abertas = kpi('ABERTAS');
  const peloApp = kpi('AGENDAMENTOS_APP');
  const comApp = kpi('COMPRADORES_COM_APP');
  const semApp = kpi('COMPRADORES_SEM_APP');
  const pct = (parte: number, total: number) => total ? `${Math.round(parte * 100 / total)}%` : '—';

  const irParaLista = () => setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  const verLista = (r: string) => {
    const novo = recorte === r ? PADRAO : r;
    if ((novo === 'COM_APP' || novo === 'SEM_APP') !== ehCompradores) setOrdem(semOrdem);
    setRecorte(novo);
    if (novo !== 'ABERTAS') setDia('');
    irParaLista();
  };
  const clicarDia = (item: { dia: string }) => {
    if (dia === item.dia) { setDia(''); setRecorte(PADRAO); }
    else { if (ehCompradores) setOrdem(semOrdem); setDia(item.dia); setRecorte('ABERTAS'); }
    irParaLista();
  };
  const clicarFaixa = (item: { ordem: number }) => verLista(`FAIXA${item.ordem}`);
  const clicarCategoria = (item: { name: string }) => { setCategoria(c => c === item.name ? '' : item.name); irParaLista(); };
  const clicarLoja = (item: { name: string }) => {
    const loja = lojas.find(l => l.nome === item.name);
    if (loja) setFiltro(f => ({ ...f, lojas: f.lojas.length === 1 && f.lojas[0] === loja.id ? [] : [loja.id] }));
  };
  const limparExtras = () => { setConsultor(''); setCategoria(''); setDia(''); setRecorte(PADRAO); setOrdem(semOrdem); };

  const faixaAtiva = idxFaixa >= 0 ? porFaixa[idxFaixa] : null;
  const cabecalho = faixaAtiva
    ? { titulo: `OS em andamento há ${faixaAtiva.name}`, descricao: 'Situação de agora, pelo tempo aberto' }
    : TITULOS[recorte] || TITULOS[PADRAO];
  const totalLista = Number((ehCompradores ? compradores[0]?.TOTAL : lista[0]?.TOTAL) || 0);
  const th = (coluna: string, rotulo: string, className = '') => (
    <ThOrdenavel coluna={coluna} ordem={ordem} onOrdem={setOrdem} className={className}>{rotulo}</ThOrdenavel>
  );
  const temApp = (v: Comprador['APP']) => v === true || v === 1 || (typeof v === 'string' && /^(s|sim|true|1)$/i.test(v.trim()));

  return (
    <div className="flex flex-col gap-5">
      <Faixa
        sobretitulo="Pós-venda"
        titulo="Oficina"
        carro="kiaPicape"
        descricao={'Ordens de serviço do Movisis. Abertas e encerradas pela data do período; "em andamento" e "abertas há mais de 30 dias" são a situação de agora.'}
      >
        <UltimaAtualizacao />
      </Faixa>

      <Filtros
        valor={filtro} onChange={setFiltro} soOficina
        outrosAtivos={!!consultor || !!categoria || !!dia || recorte !== PADRAO || ordem.dir !== ''}
        onLimpar={limparExtras}
      />
      {(consultor || categoria) && (
        <div className="flex flex-wrap gap-2">
          {consultor && <FiltroAtivo rotulo={`Consultor: ${consultor}`} onLimpar={() => setConsultor('')} />}
          {categoria && <FiltroAtivo rotulo={`Categoria: ${categoria}`} onLimpar={() => setCategoria('')} />}
        </div>
      )}

      {erro && <Card className="px-5 py-4 text-[13px] text-danger-text">Não foi possível carregar os dados: {erro}</Card>}

      {!linhas ? <SkeletonKpis count={5} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5" /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
            <Kpi rotulo="OS abertas no período" valor={fmtNum(abertas)} icone={<ClipboardList size={16} />} nota={abertas === 0 ? 'Sem dados no período' : 'Ver na lista'} onClick={() => verLista('ABERTAS')} ativo={recorte === 'ABERTAS'} />
            <Kpi rotulo="OS encerradas no período" valor={fmtNum(kpi('ENCERRADAS'))} icone={<CheckCircle2 size={16} />} nota="Ver na lista" onClick={() => verLista('ENCERRADAS')} ativo={recorte === 'ENCERRADAS'} />
            <Kpi rotulo="Valor das encerradas" valor={fmtBrl(kpi('VALOR_ENCERRADAS'))} icone={<Wallet size={16} />} nota="Peças + serviços" onClick={() => verLista('ENCERRADAS')} ativo={recorte === 'ENCERRADAS'} />
            <Kpi rotulo="Em andamento agora" valor={fmtNum(kpi('EM_ANDAMENTO'))} icone={<Timer size={16} />} nota="Ver na lista" onClick={() => verLista('EM_ANDAMENTO')} ativo={recorte === 'EM_ANDAMENTO'} />
            <Kpi rotulo="Abertas há mais de 30 dias" valor={fmtNum(kpi('ATRASADAS'))} icone={<AlertTriangle size={16} />} nota="Situação de agora" onClick={() => verLista(PADRAO)} ativo={recorte === PADRAO} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Kpi
              rotulo="Agendamentos feitos pelo app"
              valor={pct(peloApp, abertas)}
              icone={<Smartphone size={16} />}
              nota={`${fmtNum(peloApp)} de ${fmtNum(abertas)} OS abertas no período (campo Via App da OS)`}
              onClick={() => verLista('VIA_APP')} ativo={recorte === 'VIA_APP'}
            />
            <Kpi
              rotulo="Compradores de veículo com o app"
              valor={fmtNum(comApp)}
              icone={<Users size={16} />}
              nota={`${pct(comApp, comApp + semApp)} dos compradores do período (Cadastro App da Agenda de Entrega)`}
              onClick={() => verLista('COM_APP')} ativo={recorte === 'COM_APP'}
            />
            <Kpi
              rotulo="Compradores de veículo sem o app"
              valor={fmtNum(semApp)}
              icone={<UserX size={16} />}
              nota={`${pct(semApp, comApp + semApp)} dos compradores do período`}
              onClick={() => verLista('SEM_APP')} ativo={recorte === 'SEM_APP'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <div className="xl:col-span-2">
              <ChartContainer
                title="OS por consultor"
                subtitle="OS abertas no período · clique para filtrar a tela"
                action={consultor ? <button type="button" className="text-[12.5px] underline text-fg-muted" onClick={() => setConsultor('')}>Limpar</button> : undefined}
              >
                {porConsultor.length ? (
                  <div className="max-h-[560px] overflow-y-auto pr-1">
                    <ShadcnBarChart
                      data={porConsultor} layout="vertical" bars={[{ dataKey: 'value', name: 'OS' }]} showLabel
                      activeIndex={idxConsultor >= 0 ? [idxConsultor] : undefined}
                      onBarClick={(_i, idx) => { const nome = porConsultor[idx]?.name; setConsultor(c => c === nome ? '' : nome || ''); }}
                      height={Math.max(200, porConsultor.length * 34)}
                    />
                  </div>
                ) : <Vazio />}
              </ChartContainer>
            </div>
            <div className="xl:col-span-3 flex flex-col gap-5">
              <ChartContainer title="OS abertas por dia" subtitle="Data de abertura · clique num dia para ver as OS na lista">
                {porDia.length ? <ShadcnBarChart data={porDia} bars={[{ dataKey: 'value', name: 'OS' }]} showLabel height={240} activeIndex={idxDia >= 0 ? [idxDia] : undefined} onBarClick={clicarDia} /> : <Vazio />}
              </ChartContainer>
              <ChartContainer title="OS por loja" subtitle="Clique numa loja para filtrar">
                {porLoja.length ? <ShadcnBarChart data={porLoja} layout="vertical" bars={[{ dataKey: 'value', name: 'OS' }]} showLabel activeIndex={idxLoja >= 0 ? [idxLoja] : undefined} onBarClick={clicarLoja} /> : <Vazio />}
              </ChartContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartContainer title="Categorias" subtitle="Até 10 categorias · clique para filtrar">
              {porCategoria.length ? <ShadcnPieChart data={porCategoria} showLabel labelType="percent" height={260} activeIndex={idxCategoria >= 0 ? [idxCategoria] : undefined} onSliceClick={clicarCategoria} /> : <Vazio />}
            </ChartContainer>
            <ChartContainer title="OS em andamento por tempo aberto" subtitle="Situação de agora · clique para ver as OS na lista">
              {porFaixa.length ? <ShadcnBarChart data={porFaixa} bars={[{ dataKey: 'value', name: 'OS' }]} showLabel height={260} activeIndex={idxFaixa >= 0 ? [idxFaixa] : undefined} onBarClick={clicarFaixa} /> : <Vazio />}
            </ChartContainer>
          </div>

          <div ref={listaRef} className="scroll-mt-4">
            <Card className="py-5">
              <CardHeader className="px-5 pb-4">
                <CardTitle>{cabecalho.titulo}</CardTitle>
                <CardDescription>{cabecalho.descricao}</CardDescription>
                {(recorte !== PADRAO || dia) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recorte !== PADRAO && <FiltroAtivo rotulo={cabecalho.titulo} onLimpar={() => { setRecorte(PADRAO); setDia(''); setOrdem(semOrdem); }} />}
                    {dia && <FiltroAtivo rotulo={`Dia: ${fmtData(dia)}`} onLimpar={() => setDia('')} />}
                  </div>
                )}
              </CardHeader>
              {ehCompradores ? (
                compradores.length ? (
                  <div className="overflow-x-auto">
                    <table className="tabela">
                      <thead><tr>{th('CLIENTE', 'Cliente')}<th>App</th>{th('COMPRAS', 'Compras', 'text-right')}{th('ULTIMA', 'Última compra')}{th('LOJAS', 'Lojas')}{th('VEICULO', 'Veículo')}</tr></thead>
                      <tbody>
                        {compradores.map((c, i) => (
                          <tr key={c.CLIENTE + '-' + i}>
                            <td className="max-w-[260px] truncate" title={c.CLIENTE}>{c.CLIENTE}</td>
                            <td><Badge variant={temApp(c.APP) ? 'success' : 'neutral'}>{temApp(c.APP) ? 'Com app' : 'Sem app'}</Badge></td>
                            <td className="text-right tabular-nums">{fmtNum(c.COMPRAS)}</td>
                            <td className="tabular-nums">{fmtData(c.ULTIMA_COMPRA)}</td>
                            <td className="max-w-[220px] truncate" title={c.LOJAS}>{c.LOJAS}</td>
                            <td className="max-w-[220px] truncate" title={c.VEICULO}>{c.VEICULO}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="px-5"><div className="py-10 text-center text-[13px] text-fg-subtle">Nenhum comprador neste recorte</div></div>
              ) : lista.length ? (
                <div className="overflow-x-auto">
                  <table className="tabela">
                    <thead><tr>
                      {th('OS', 'OS')}{th('LOJA', 'Loja')}{th('CLIENTE', 'Cliente')}{th('CONSULTOR', 'Consultor')}{th('ABERTURA', 'Abertura')}
                      {th('ENCERRAMENTO', 'Encerramento')}{th('SITUACAO', 'Situação')}{th('DIAS', 'Dias em aberto', 'text-right')}{th('TOTAL', 'Total da OS', 'text-right')}
                      {th('VEICULO', 'Veículo')}{th('CATEGORIA', 'Categoria')}{th('APP', 'App')}
                    </tr></thead>
                    <tbody>
                      {lista.map(o => {
                        const andamento = o.EM_ANDAMENTO === true || o.EM_ANDAMENTO === 1;
                        return (
                          <tr key={o.LOJA_NOME + '-' + o.NRO_OS}>
                            <td className="tabular-nums">{o.NRO_OS}</td>
                            <td>{o.LOJA_NOME}</td>
                            <td className="max-w-[240px] truncate" title={o.CLIENTE}>{o.CLIENTE}</td>
                            <td>{o.CONSULTOR || '—'}</td>
                            <td className="tabular-nums">{fmtData(o.DATA_ABERTURA)}</td>
                            <td className="tabular-nums">{o.DATA_ENCERRAMENTO ? fmtData(o.DATA_ENCERRAMENTO) : '—'}</td>
                            <td>{o.SITUACAO || (andamento ? 'Em andamento' : 'Encerrada')}</td>
                            <td className="text-right tabular-nums">
                              {andamento
                                ? <Badge variant={o.DIAS_ABERTA > 90 ? 'danger' : o.DIAS_ABERTA > 30 ? 'warning' : 'neutral'}>{fmtNum(o.DIAS_ABERTA)}</Badge>
                                : fmtNum(o.DIAS_ABERTA)}
                            </td>
                            <td className="text-right tabular-nums">{fmtBrl(o.TOTAL_OS)}</td>
                            <td className="max-w-[200px] truncate" title={o.MODELO}>{o.MODELO}{o.PLACA ? ` · ${o.PLACA}` : ''}</td>
                            <td>{o.CATEGORIA}</td>
                            <td>{o.VIA_APP === true || o.VIA_APP === 1 ? 'Sim' : 'Não'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className="px-5"><div className="py-10 text-center text-[13px] text-fg-subtle">Nenhuma OS neste recorte</div></div>}
              <Paginacao pagina={pagina} tamanho={TAMANHO} total={totalLista} onPagina={setPagina} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
