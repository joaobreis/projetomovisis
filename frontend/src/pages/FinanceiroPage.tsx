import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Coins, HandCoins, PiggyBank, Hourglass, CalendarX, PlusCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { ChartContainer, ShadcnBarChart } from '../components/ui/Chart';
import { SkeletonKpis } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Filtros, { filtroInicial, type FiltroBase } from '../components/painel/Filtros';
import Kpi from '../components/painel/Kpi';
import FiltroAtivo from '../components/painel/FiltroAtivo';
import Paginacao from '../components/painel/Paginacao';
import ThOrdenavel, { semOrdem, type Ordem } from '../components/painel/ThOrdenavel';
import { ToastContainer, type ToastData } from '../components/ui/Toast';
import Faixa from '../components/layout/Faixa';
import { Vazio } from './VendasPage';
import ImportarCashback from './ImportarCashback';
import { callSF, SF } from '../lib/api';
import { TIPOS_CASHBACK, type TipoCashback } from '../lib/cashback';
import { fmtBrl, fmtBrlCurto, fmtData, fmtDataHora, fmtMesAno, fmtNum } from '../lib/format';
import { getMitraErrorMessage } from '../lib/utils';

interface Linha { SECAO: string; NOME: string; QTD: number; VALOR: number | null; CLIENTES: number | string | null }
interface Registro {
  LOJA_CODIGO: string; CONTATO: number | null; NOME_CLIENTE: string; TELEFONE: string | null; DATA_EMISSAO: string | null;
  VALOR_CASHBACK: number | null; CASHBACK_UTILIZADO: number | null; SALDO_CASHBACK: number | null; DATA_VALIDADE: string | null;
  DATA_RESGATE: string | null; USUARIO_RESPONSAVEL: string | null; SITUACAO_BONUS: string | null; ORIGEM: string | null; OBSERVACAO: string | null; TOTAL: number;
}

const TAMANHO = 20;
const PADRAO: TipoCashback = 'GERADO';
const ICONES: Record<TipoCashback, React.ReactNode> = {
  GERADO: <Coins size={16} />, RESGATADO: <HandCoins size={16} />, DISPONIVEL: <PiggyBank size={16} />,
  EXPIRA_30: <Hourglass size={16} />, EXPIRADO: <CalendarX size={16} />, AVULSO: <PlusCircle size={16} />,
};
const COM_SALDO = new Set<TipoCashback>(['DISPONIVEL', 'EXPIRA_30']);

export default function FinanceiroPage() {
  const [filtro, setFiltro] = useState<FiltroBase>(filtroInicial);
  const [tipo, setTipo] = useState<TipoCashback>(PADRAO);
  const [mes, setMes] = useState('');
  const [ordem, setOrdem] = useState<Ordem>(semOrdem);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [lista, setLista] = useState<Registro[]>([]);
  const [pagina, setPagina] = useState(0);
  const [erro, setErro] = useState('');
  const [importando, setImportando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const versao = useRef(0);
  const listaRef = useRef<HTMLDivElement>(null);

  const input = useMemo(() => ({ ini: filtro.ini, fim: filtro.fim, lojas: filtro.lojas.join(','), tipo }), [filtro, tipo]);

  useEffect(() => { setPagina(0); }, [input, mes, ordem]);

  useEffect(() => {
    const v = ++versao.current;
    setErro('');
    Promise.all([
      callSF<Linha>(SF.cashbackPainel, input),
      callSF<Registro>(SF.cashbackLista, { ...input, mes, ordem: ordem.coluna, dir: ordem.dir, limit: TAMANHO, offset: pagina * TAMANHO }),
    ]).then(([painel, itens]) => {
      if (v !== versao.current) return;
      setLinhas(painel);
      setLista(itens);
    }).catch(e => { if (v === versao.current) setErro(getMitraErrorMessage(e)); });
  }, [input, mes, ordem, pagina, recarga]);

  const secao = (s: string) => (linhas || []).filter(l => l.SECAO === s);
  const porTipo = (t: string) => secao('TIPO').find(l => l.NOME === t);
  const porMes = secao('MES').map(l => ({ mes: l.NOME, name: fmtMesAno(l.NOME), value: Number(l.VALOR || 0), qtd: Number(l.QTD) })).sort((a, b) => a.mes.localeCompare(b.mes));
  const importado = (t: string) => secao('IMPORTADO').find(l => l.NOME === t);
  const idxMes = mes ? porMes.findIndex(m => m.mes === mes) : -1;
  const info = TIPOS_CASHBACK.find(t => t.codigo === tipo)!;
  const ultimaImportacao = importado(tipo)?.CLIENTES;

  const irParaLista = () => setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  const escolherTipo = (t: TipoCashback) => {
    const novo = tipo === t && t !== PADRAO ? PADRAO : t;
    setTipo(novo); setMes(''); setOrdem(semOrdem);
    irParaLista();
  };
  const clicarMes = (item: { mes: string }) => { setMes(m => m === item.mes ? '' : item.mes); irParaLista(); };
  const limparExtras = () => { setTipo(PADRAO); setMes(''); setOrdem(semOrdem); };
  const avisar = (type: ToastData['type'], message: string) => setToasts(t => [...t, { id: `${Date.now()}-${t.length}`, type, message }]);

  const th = (coluna: string, rotulo: string, className = '') => (
    <ThOrdenavel coluna={coluna} ordem={ordem} onOrdem={setOrdem} className={className}>{rotulo}</ThOrdenavel>
  );

  return (
    <div className="flex flex-col gap-5">
      <Faixa
        sobretitulo="Financeiro"
        titulo="Cashback"
        carro="kiaEv9"
        descricao="Relatórios de cashback do Movisis. Os valores de Disponível e Expira em 30 dias são o saldo; os outros, o valor do cashback."
        acao={<Button variant="secondary" onClick={() => setImportando(true)}><ClipboardPaste size={16} /> Colar JSON</Button>}
      >
        {ultimaImportacao ? <span className="text-[12.5px] text-fg-subtle">{info.nome}: importado em {fmtDataHora(String(ultimaImportacao))}</span> : null}
      </Faixa>

      <Filtros valor={filtro} onChange={setFiltro} outrosAtivos={tipo !== PADRAO || !!mes || ordem.dir !== ''} onLimpar={limparExtras} />

      {erro && <Card className="px-5 py-4 text-[13px] text-danger-text">Não foi possível carregar os dados: {erro}</Card>}

      {!linhas ? <SkeletonKpis count={6} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5" /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
            {TIPOS_CASHBACK.map(t => {
              const l = porTipo(t.codigo);
              return (
                <Kpi
                  key={t.codigo}
                  rotulo={t.nome}
                  valor={fmtBrl(Number(l?.VALOR || 0))}
                  icone={ICONES[t.codigo]}
                  nota={l ? `${fmtNum(Number(l.QTD))} registros · ${fmtNum(Number(l.CLIENTES || 0))} clientes` : 'Nada importado no período'}
                  onClick={() => escolherTipo(t.codigo)}
                  ativo={tipo === t.codigo}
                />
              );
            })}
          </div>

          <ChartContainer
            title={`${info.nome} por mês`}
            subtitle={`${COM_SALDO.has(tipo) ? 'Saldo' : 'Valor'} pela data de emissão · clique num mês para ver na lista`}
          >
            {porMes.length ? (
              <ShadcnBarChart
                data={porMes} bars={[{ dataKey: 'value', name: COM_SALDO.has(tipo) ? 'Saldo' : 'Valor' }]} showLabel height={260}
                formatter={fmtBrl} labelFormatter={fmtBrlCurto}
                activeIndex={idxMes >= 0 ? [idxMes] : undefined} onBarClick={clicarMes}
              />
            ) : <Vazio />}
          </ChartContainer>

          <div ref={listaRef} className="scroll-mt-4">
            <Card className="py-5">
              <CardHeader className="px-5 pb-4">
                <CardTitle>{info.nome}</CardTitle>
                <CardDescription>{info.nota}</CardDescription>
                {(tipo !== PADRAO || mes) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tipo !== PADRAO && <FiltroAtivo rotulo={`Relatório: ${info.nome}`} onLimpar={() => escolherTipo(PADRAO)} />}
                    {mes && <FiltroAtivo rotulo={`Mês: ${fmtMesAno(mes)}`} onLimpar={() => setMes('')} />}
                  </div>
                )}
              </CardHeader>
              {lista.length ? (
                <div className="overflow-x-auto">
                  <table className="tabela">
                    <thead><tr>
                      {th('EMISSAO', 'Emissão')}{th('LOJA', 'Loja')}{th('CONTATO', 'Contato')}{th('CLIENTE', 'Cliente')}<th>Telefone</th>
                      {th('VALOR', 'Cashback', 'text-right')}{th('UTILIZADO', 'Utilizado', 'text-right')}{th('SALDO', 'Saldo', 'text-right')}
                      {th('VALIDADE', 'Validade')}{th('RESGATE', 'Resgate')}{th('RESPONSAVEL', 'Responsável')}<th>Situação</th><th>Origem</th>
                    </tr></thead>
                    <tbody>
                      {lista.map((r, i) => (
                        <tr key={`${r.LOJA_CODIGO}-${r.CONTATO ?? ''}-${i}`}>
                          <td className="tabular-nums">{fmtData(r.DATA_EMISSAO)}</td>
                          <td>{r.LOJA_CODIGO}</td>
                          <td className="tabular-nums">{r.CONTATO ?? '—'}</td>
                          <td className="max-w-[240px] truncate" title={r.OBSERVACAO ? `${r.NOME_CLIENTE} · ${r.OBSERVACAO}` : r.NOME_CLIENTE}>{r.NOME_CLIENTE}</td>
                          <td className="tabular-nums whitespace-nowrap">{r.TELEFONE || '—'}</td>
                          <td className="text-right tabular-nums">{r.VALOR_CASHBACK == null ? '—' : fmtBrl(r.VALOR_CASHBACK)}</td>
                          <td className="text-right tabular-nums">{r.CASHBACK_UTILIZADO == null ? '—' : fmtBrl(r.CASHBACK_UTILIZADO)}</td>
                          <td className="text-right tabular-nums">{r.SALDO_CASHBACK == null ? '—' : fmtBrl(r.SALDO_CASHBACK)}</td>
                          <td className="tabular-nums">{fmtData(r.DATA_VALIDADE)}</td>
                          <td className="tabular-nums">{fmtData(r.DATA_RESGATE)}</td>
                          <td className="max-w-[160px] truncate" title={r.USUARIO_RESPONSAVEL || ''}>{r.USUARIO_RESPONSAVEL || '—'}</td>
                          <td>{r.SITUACAO_BONUS || '—'}</td>
                          <td>{r.ORIGEM || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="px-5"><div className="py-10 text-center text-[13px] text-fg-subtle">Nenhum registro neste recorte</div></div>}
              <Paginacao pagina={pagina} tamanho={TAMANHO} total={Number(lista[0]?.TOTAL || 0)} onPagina={setPagina} />
            </Card>
          </div>
        </>
      )}

      <ImportarCashback
        key={tipo}
        aberto={importando}
        tipoInicial={tipo}
        onFechar={() => setImportando(false)}
        onImportado={(t, qtd) => {
          setImportando(false);
          avisar('success', `${fmtNum(qtd)} registros de ${TIPOS_CASHBACK.find(x => x.codigo === t)?.nome} importados.`);
          setTipo(t); setMes(''); setRecarga(r => r + 1);
        }}
      />
      <ToastContainer toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}
