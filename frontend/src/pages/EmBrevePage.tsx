import { Clock } from 'lucide-react';
import Faixa from '../components/layout/Faixa';
import { Card } from '../components/ui/Card';

const TEXTO: Record<string, { titulo: string; itens: string[] }> = {
  PECAS: { titulo: 'Peças', itens: ['Vendas de peças de balcão', 'Faturamento de peças'] },
};

export default function EmBrevePage({ area }: { area: 'PECAS' }) {
  const t = TEXTO[area];
  return (
    <div className="flex flex-col gap-5">
      <Faixa sobretitulo="Em breve" titulo={t.titulo} carro="kiaCompacto" />
      <Card className="px-6 py-10 flex flex-col items-center gap-3 text-center">
        <span className="pilula gap-1.5"><Clock size={14} /> em breve</span>
        <p className="text-[14px] text-fg max-w-lg">
          Esta área entra na próxima fase. A integração atual com o Movisis ainda não traz estes dados, então nenhum número é mostrado aqui.
        </p>
        <ul className="text-[13px] text-fg-subtle flex flex-col gap-1">
          {t.itens.map(i => <li key={i}>{i}</li>)}
        </ul>
      </Card>
    </div>
  );
}
