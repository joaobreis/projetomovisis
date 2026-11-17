import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import RadioGroup from '../components/ui/Radio';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { SkeletonTable } from '../components/ui/Skeleton';
import { ToastContainer, type ToastData } from '../components/ui/Toast';
import { callSF, runSF, SF } from '../lib/api';
import { useSessao } from '../lib/sessao';
import { getMitraErrorMessage } from '../lib/utils';
import Faixa from '../components/layout/Faixa';
import ConvitesCard from './ConvitesCard';

interface Usuario { ID: number; EMAIL: string; DIRETOR: 'S' | 'N'; GERENTE: 'S' | 'N'; AREAS: string | null }

export default function PermissoesPage() {
  const { areas, params, recarregar, dev } = useSessao();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [edicao, setEdicao] = useState<Record<number, string[]>>({});
  const [salvando, setSalvando] = useState<number | null>(null);
  const [criterio, setCriterio] = useState(params.CRITERIO_SEMINOVOS || 'LOJA');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [erro, setErro] = useState('');

  const avisar = (type: ToastData['type'], message: string) => setToasts(t => [...t, { id: `${Date.now()}-${t.length}`, type, message }]);

  const carregar = () => {
    callSF<Usuario>(SF.permissoesListar).then(lista => {
      setUsuarios(lista);
      setEdicao(Object.fromEntries(lista.map(u => [u.ID, (u.AREAS || '').split(',').filter(Boolean)])));
    }).catch(e => setErro(getMitraErrorMessage(e)));
  };
  useEffect(carregar, []);

  const alternar = (id: number, codigo: string, marcado: boolean) =>
    setEdicao(e => ({ ...e, [id]: marcado ? [...(e[id] || []), codigo] : (e[id] || []).filter(c => c !== codigo) }));

  const salvar = async (u: Usuario) => {
    setSalvando(u.ID);
    try {
      await runSF(SF.permissoesSalvar, { usuarioId: u.ID, areas: (edicao[u.ID] || []).join(',') });
      avisar('success', `Áreas de ${u.EMAIL} salvas. Valem no próximo acesso.`);
      carregar();
    } catch (e) { avisar('error', getMitraErrorMessage(e)); }
    setSalvando(null);
  };

  const salvarCriterio = async (valor: string) => {
    setCriterio(valor);
    try {
      await runSF(SF.parametroSalvar, { valor });
      avisar('success', 'Critério de Seminovos atualizado.');
      recarregar();
    } catch (e) { avisar('error', getMitraErrorMessage(e)); }
  };

  const mudou = (u: Usuario) => [...(edicao[u.ID] || [])].sort().join(',') !== (u.AREAS || '').split(',').filter(Boolean).sort().join(',');

  return (
    <div className="flex flex-col gap-5">
      <Faixa
        sobretitulo="Administração"
        titulo="Permissões"
        carro="kiaSuv"
        descricao={'Marque as áreas que cada pessoa vê. Quem tem o perfil Diretor vê todas as áreas e administra esta tela. Para dar acesso a alguém novo, use "Convidar pessoas" mais abaixo.'}
      />

      {erro && <Card className="px-5 py-4 text-[13px] text-danger-text">Não foi possível carregar: {erro}</Card>}

      <Card className="py-5">
        <CardHeader className="px-5 pb-4"><CardTitle>Áreas por pessoa</CardTitle><CardDescription>A mudança vale no próximo acesso da pessoa</CardDescription></CardHeader>
        {!usuarios ? <div className="px-5"><SkeletonTable /></div> : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Pessoa</th>{areas.map(a => <th key={a.codigo}>{a.nome}</th>)}<th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.ID}>
                    <td>{u.EMAIL} {u.DIRETOR === 'S' && <Badge variant="accent">Diretor</Badge>}</td>
                    {areas.map(a => (
                      <td key={a.codigo}>
                        {u.DIRETOR === 'S'
                          ? <Checkbox checked disabled />
                          : <Checkbox checked={(edicao[u.ID] || []).includes(a.codigo)} onChange={m => alternar(u.ID, a.codigo, m)} />}
                      </td>
                    ))}
                    <td className="text-right">
                      {u.DIRETOR !== 'S' && (
                        <Button size="sm" variant={mudou(u) ? 'primary' : 'secondary'} disabled={!mudou(u) || salvando === u.ID} onClick={() => salvar(u)}>
                          {salvando === u.ID ? 'Salvando…' : 'Salvar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dev && <ConvitesCard pessoas={usuarios || []} onMudou={carregar} avisar={avisar} />}

      <Card className="py-5">
        <CardHeader className="px-5 pb-4"><CardTitle>O que conta como Seminovos</CardTitle><CardDescription>Novos recebe todas as outras vendas</CardDescription></CardHeader>
        <div className="px-5 pt-4">
          <RadioGroup
            value={criterio}
            onChange={salvarCriterio}
            options={[
              { value: 'LOJA', label: 'Vendas da loja 3.1 Premier Seminovos (padrão)' },
              { value: 'VEICULO', label: 'Veículos usados de todas as lojas' },
              { value: 'AMBOS', label: 'Loja 3.1 e veículos usados das demais lojas' },
            ]}
          />
        </div>
      </Card>

      <ToastContainer toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}
