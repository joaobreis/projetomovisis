import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { initMitra } from './lib/mitra-auth'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/layout/AppLayout'
import VendasPage from './pages/VendasPage'
import OficinaPage from './pages/OficinaPage'
import EmBrevePage from './pages/EmBrevePage'
import FinanceiroPage from './pages/FinanceiroPage'
import VisaoGeralPage from './pages/VisaoGeralPage'
import PermissoesPage from './pages/PermissoesPage'
import { Card } from './components/ui/Card'
import { SkeletonPage } from './components/ui/Skeleton'
import { callSF, runSF, SF } from './lib/api'
import { SessaoContext, useSessao, ROTA_AREA, type Sessao, type Atualizacao } from './lib/sessao'
import { getMitraErrorMessage } from './lib/utils'

interface LinhaSessao { SECAO: string; C1: string | null; C2: string | null; C3: string | null; C4: string | null; C5: string | null }

function montarSessao(linhas: LinhaSessao[], recarregar: () => void): Sessao {
  const de = (s: string) => linhas.filter(l => l.SECAO === s)
  const usuario = de('USUARIO')[0]
  const atualizacao = (l?: LinhaSessao): Atualizacao | null => l ? { fim: l.C1, status: l.C2 || '', lojasFalha: l.C3 || '', detalhe: l.C4 } : null
  return {
    email: usuario?.C1 || '',
    diretor: usuario?.C2 === 'S',
    dev: usuario?.C3 === 'S',
    areas: de('AREA').map(l => ({ codigo: l.C1 || '', nome: l.C2 || '', disponivel: l.C3 === 'S', liberada: l.C4 === 'S', ordem: Number(l.C5) }))
      .sort((a, b) => a.ordem - b.ordem),
    lojas: de('LOJA').map(l => ({ id: l.C1 || '', nome: l.C2 || '', codigo: l.C3 || '', temOficina: l.C4 === 'S', grupo: l.C5 || '' })),
    tipos: de('TIPO').map(l => l.C1 || '').filter(Boolean),
    params: Object.fromEntries(de('PARAM').map(l => [l.C1 || '', l.C2 || ''])),
    ultimaOk: atualizacao(de('ULTIMA_OK')[0]),
    ultima: atualizacao(de('ULTIMA')[0]),
    recarregar,
  }
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <Card className="px-8 py-10 max-w-md flex flex-col items-center gap-3 text-center">
        <Lock size={22} className="text-fg-subtle" />
        <h1 className="text-[17px] font-semibold text-fg">{titulo}</h1>
        <p className="text-[13px] text-fg-muted">{texto}</p>
      </Card>
    </div>
  )
}

function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao(v => v + 1), [])
  useEffect(() => {
    runSF(SF.conviteAplicar).catch(() => undefined)
      .then(() => callSF<LinhaSessao>(SF.sessao))
      .then(l => setSessao(montarSessao(l, recarregar)))
      .catch(e => setErro(getMitraErrorMessage(e)))
  }, [versao, recarregar])

  if (erro) return <Mensagem titulo="Não foi possível abrir o Premier Insights" texto={erro} />
  if (!sessao) return <div className="p-8"><SkeletonPage /></div>
  if (!sessao.areas.some(a => a.liberada)) {
    return <Mensagem titulo="Você ainda não tem acesso" texto="Nenhuma área está liberada para você. Peça ao diretor para liberar a sua área no Premier Insights." />
  }
  return <SessaoContext.Provider value={sessao}>{children}</SessaoContext.Provider>
}

function SemAcesso() {
  return (
    <Card className="px-6 py-10 flex flex-col items-center gap-3 text-center">
      <Lock size={20} className="text-fg-subtle" />
      <p className="text-[14px] text-fg">Esta área não está liberada para você.</p>
      <p className="text-[13px] text-fg-subtle">Se precisar dela, peça ao diretor.</p>
    </Card>
  )
}

function Area({ codigo, children }: { codigo: string; children: ReactNode }) {
  const { areas } = useSessao()
  return areas.some(a => a.codigo === codigo && a.liberada) ? <>{children}</> : <SemAcesso />
}

function SoDiretor({ children }: { children: ReactNode }) {
  return useSessao().diretor ? <>{children}</> : <SemAcesso />
}

function Inicio() {
  const visiveis = useSessao().areas.filter(a => a.liberada)
  if (visiveis.length === 1) return <Navigate to={ROTA_AREA[visiveis[0].codigo]} replace />
  return <VisaoGeralPage />
}

function App() {
  const [configured, setConfigured] = useState(initMitra)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={() => setConfigured(true)} />} />
      <Route element={configured ? <SessaoProvider><AppLayout /></SessaoProvider> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/novos" element={<Area codigo="NOVOS"><VendasPage area="NOVOS" /></Area>} />
        <Route path="/seminovos" element={<Area codigo="SEMINOVOS"><VendasPage area="SEMINOVOS" /></Area>} />
        <Route path="/oficina" element={<Area codigo="OFICINA"><OficinaPage /></Area>} />
        <Route path="/pecas" element={<Area codigo="PECAS"><EmBrevePage area="PECAS" /></Area>} />
        <Route path="/financeiro" element={<Area codigo="FINANCEIRO"><FinanceiroPage /></Area>} />
        <Route path="/permissoes" element={<SoDiretor><PermissoesPage /></SoDiretor>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
