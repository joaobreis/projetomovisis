import { Link, Outlet, useLocation } from 'react-router-dom';
import { Car, CarFront, Wrench, Package, Wallet, LayoutDashboard, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSessao, ROTA_AREA } from '../../lib/sessao';
import { fmtDataHora } from '../../lib/format';
import Tooltip from '../ui/Tooltip';
import logoGrupo from '../../assets/marca/logo-grupo-branco.webp';
import logoJeep from '../../assets/marca/jeep.webp';
import logoRam from '../../assets/marca/ram.webp';
import logoKia from '../../assets/marca/kia.webp';
import logoSeminovos from '../../assets/marca/seminovos.webp';

const ICONES: Record<string, ReactNode> = {
  NOVOS: <CarFront size={16} />,
  SEMINOVOS: <Car size={16} />,
  OFICINA: <Wrench size={16} />,
  PECAS: <Package size={16} />,
  FINANCEIRO: <Wallet size={16} />,
};

export function UltimaAtualizacao() {
  const { ultimaOk, ultima, diretor } = useSessao();
  const falhou = ultima && ultima.status !== 'OK' && ultima.fim !== ultimaOk?.fim;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-subtle">
      <RefreshCw size={14} />
      <span>Atualizado em {fmtDataHora(ultimaOk?.fim)}</span>
      {ultimaOk?.status === 'PARCIAL' && <span className="pilula">Sem dados novos das lojas {ultimaOk.lojasFalha}</span>}
      {falhou && (
        <span className="inline-flex items-center gap-1 text-warning-text">
          <AlertTriangle size={14} />
          {ultima?.status === 'CREDENCIAL'
            ? 'A integração com o Movisis precisa de nova credencial'
            : 'A última atualização falhou; os números são da anterior'}
          {diretor && ultima?.detalhe && <Tooltip content={ultima.detalhe}><span className="underline cursor-help">detalhe</span></Tooltip>}
        </span>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { areas, diretor } = useSessao();
  const visiveis = areas.filter(a => a.liberada);
  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="menu-premier md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r flex md:flex-col">
        <Link to="/" className="flex items-center px-4 py-3 md:px-5 md:pt-7 md:pb-2 shrink-0" aria-label="Premier Insights">
          <img src={logoGrupo} alt="Grupo Auto Premier" className="h-7 md:h-9 w-auto" />
        </Link>
        <div className="hidden md:block px-5 pb-4 text-[11px] tracking-[.28em] uppercase text-fg-subtle">Premier Insights</div>
        <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto md:flex-1">
          {visiveis.length > 1 && (
            <NavItem to="/" end icone={<LayoutDashboard size={16} />} nome="Visão geral" />
          )}
          <div className="rotulo-secao hidden md:block px-3 pt-4 pb-1">Áreas</div>
          {visiveis.map(a => (
            <NavItem key={a.codigo} to={ROTA_AREA[a.codigo]} icone={ICONES[a.codigo]} nome={a.nome} emBreve={!a.disponivel} />
          ))}
          {diretor && (
            <>
              <div className="rotulo-secao hidden md:block px-3 pt-4 pb-1">Administração</div>
              <NavItem to="/permissoes" icone={<ShieldCheck size={16} />} nome="Permissões" />
            </>
          )}
        </nav>
        <div className="hidden md:grid grid-cols-2 gap-x-4 gap-y-3 items-center px-5 py-5 border-t border-border opacity-50">
          <img src={logoJeep} alt="Jeep" className="h-5 w-auto" />
          <img src={logoRam} alt="RAM" className="h-5 w-auto" />
          <img src={logoKia} alt="Kia" className="h-5 w-auto" />
          <img src={logoSeminovos} alt="Premier Seminovos" className="h-5 w-auto" />
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-[1600px]">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icone, nome, emBreve, end }: { to: string; icone: ReactNode; nome: string; emBreve?: boolean; end?: boolean }) {
  const location = useLocation();
  const ativo = end ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link to={to} className="nav-item md:w-full" data-active={ativo}>
      {icone}
      <span className="flex-1">{nome}</span>
      {emBreve && <span className="pilula">em breve</span>}
    </Link>
  );
}
