import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SkeletonKpis } from '../components/ui/Skeleton';
import { UltimaAtualizacao } from '../components/layout/AppLayout';
import { callSF, SF } from '../lib/api';
import { fmtBrlCurto, fmtNum, isoHoje, isoInicioMes } from '../lib/format';
import { useSessao, ROTA_AREA } from '../lib/sessao';
import Faixa from '../components/layout/Faixa';
import { getMitraErrorMessage } from '../lib/utils';

interface Linha { SECAO: string; NOME: string; QTD: number }
interface Destaque { rotulo: string; valor: number; moeda?: boolean }

export default function VisaoGeralPage() {
  const { areas } = useSessao();
  const liberadas = areas.filter(a => a.liberada);
  const [numeros, setNumeros] = useState<Record<string, Destaque[]> | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const periodo = { ini: isoInicioMes(), fim: isoHoje(), lojas: '' };
    const chamadas = liberadas.filter(a => a.disponivel).map(async a => {
      if (a.codigo === 'FINANCEIRO') {
        const l = await callSF<{ SECAO: string; NOME: string; VALOR: number | null }>(SF.cashbackPainel, { ...periodo, tipo: 'GERADO' });
        const v = (n: string) => Number(l.find(x => x.SECAO === 'TIPO' && x.NOME === n)?.VALOR || 0);
        return [a.codigo, [
          { rotulo: 'Cashback gerado no mês', valor: v('GERADO'), moeda: true },
          { rotulo: 'Resgatado', valor: v('RESGATADO'), moeda: true },
          { rotulo: 'Saldo disponível', valor: v('DISPONIVEL'), moeda: true },
        ]] as const;
      }
      if (a.codigo === 'OFICINA') {
        const l = await callSF<Linha>(SF.oficinaPainel, { ...periodo, consultor: '' });
        const k = (n: string) => Number(l.find(x => x.SECAO === 'KPI' && x.NOME === n)?.QTD || 0);
        return [a.codigo, [
          { rotulo: 'OS abertas no mês', valor: k('ABERTAS') },
          { rotulo: 'Em andamento agora', valor: k('EM_ANDAMENTO') },
          { rotulo: 'Abertas há mais de 30 dias', valor: k('ATRASADAS') },
        ]] as const;
      }
      const l = await callSF<Linha>(SF.vendasPainel, { ...periodo, area: a.codigo, tipos: '', vendedor: '' });
      const k = (n: string) => Number(l.find(x => x.SECAO === 'KPI' && x.NOME === n)?.QTD || 0);
      return [a.codigo, [
        { rotulo: 'Vendas no mês', valor: k('TOTAL') },
        { rotulo: 'Entregues', valor: k('ENTREGUES') },
        { rotulo: 'Pendentes ou agendadas', valor: k('A_ENTREGAR') },
      ]] as const;
    });
    Promise.all(chamadas)
      .then(r => setNumeros(Object.fromEntries(r.map(([c, d]) => [c, [...d]]))))
      .catch(e => setErro(getMitraErrorMessage(e)));
  }, [areas]);

  return (
    <div className="flex flex-col gap-5">
      <Faixa titulo="Visão geral" carro="compassBranco" descricao="Mês atual, todas as lojas. Abra uma área para filtrar por período e loja.">
        <UltimaAtualizacao />
      </Faixa>
      {erro && <Card className="px-5 py-4 text-[13px] text-danger-text">Não foi possível carregar os dados: {erro}</Card>}
      {!numeros && !erro ? <SkeletonKpis count={3} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {liberadas.map(a => (
            <Link key={a.codigo} to={ROTA_AREA[a.codigo]} className="block">
              <Card className="px-5 py-5 h-full flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold text-fg">{a.nome}</span>
                  {a.disponivel ? <ArrowRight size={16} className="text-fg-subtle" /> : <span className="pilula gap-1"><Clock size={12} /> em breve</span>}
                </div>
                {a.disponivel ? (
                  <div className="grid grid-cols-3 gap-3">
                    {(numeros?.[a.codigo] || []).map(d => (
                      <div key={d.rotulo} className="flex flex-col gap-1">
                        <span className="text-[20px] font-semibold tabular-nums text-fg">{d.moeda ? fmtBrlCurto(d.valor) : fmtNum(d.valor)}</span>
                        <span className="text-[12px] text-fg-subtle">{d.rotulo}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[13px] text-fg-subtle">Entra na próxima fase, sem números por enquanto.</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
