import { useEffect, useState } from 'react';
import { manageUserAccessMitra } from 'mitra-sdk';
import { setProfileUsersMitra, listProfilesMitra } from 'mitra-interactions-sdk';
import { Info, Mail, UserMinus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { callSF, runSF, SF } from '../lib/api';
import { fmtDataHora } from '../lib/format';
import { useSessao } from '../lib/sessao';
import { getMitraErrorMessage } from '../lib/utils';

const PROJECT_ID = Number(import.meta.env.VITE_MITRA_PROJECT_ID);

interface Convite { EMAIL: string; AREAS: string | null; CRIADO_EM: string }
interface Pessoa { ID: number; EMAIL: string; DIRETOR: 'S' | 'N'; GERENTE: 'S' | 'N'; AREAS: string | null }

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function perfilId(nome: string): Promise<number> {
  const res = await listProfilesMitra({ projectId: PROJECT_ID });
  const p = (res?.result || []).find(x => x.name === nome);
  if (!p) throw new Error(`Perfil ${nome} não encontrado no produto`);
  return Number(p.id);
}

export default function ConvitesCard({ pessoas, onMudou, avisar }: {
  pessoas: Pessoa[];
  onMudou: () => void;
  avisar: (tipo: 'success' | 'error' | 'info', texto: string) => void;
}) {
  const { areas, email: meuEmail } = useSessao();
  const [email, setEmail] = useState('');
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [remover, setRemover] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const carregar = () => { callSF<Convite>(SF.convitesListar).then(setConvites).catch(() => setConvites([])); };
  useEffect(carregar, []);

  const nomeArea = (c: string) => areas.find(a => a.codigo === c)?.nome || c;
  const emailLimpo = email.trim().toLowerCase();
  const valido = EMAIL_OK.test(emailLimpo) && marcadas.length > 0;

  const convidar = async () => {
    if (!valido) return;
    setEnviando(true);
    try {
      await runSF(SF.conviteSalvar, { email: emailLimpo, areas: marcadas.join(',') });
      await manageUserAccessMitra({ projectId: PROJECT_ID, email: emailLimpo, action: 'INVITE', type: 'business' });
      try {
        await setProfileUsersMitra({ projectId: PROJECT_ID, profileId: await perfilId('Gerente'), emails: [emailLimpo] });
      } catch { /* quem ainda não aceitou entra no perfil no primeiro acesso */ }
      avisar('success', `Convite enviado para ${emailLimpo}. As áreas valem no primeiro acesso.`);
      setEmail(''); setMarcadas([]);
      carregar(); onMudou();
    } catch (e) {
      avisar('error', `Não foi possível convidar: ${getMitraErrorMessage(e)}`);
    }
    setEnviando(false);
  };

  const cancelarConvite = async (alvo: string) => {
    try {
      await runSF(SF.conviteCancelar, { email: alvo });
      await manageUserAccessMitra({ projectId: PROJECT_ID, email: alvo, action: 'REMOVE' }).catch(() => undefined);
      carregar();
      avisar('info', `Convite de ${alvo} cancelado.`);
    }
    catch (e) { avisar('error', getMitraErrorMessage(e)); }
  };

  const confirmarRemocao = async () => {
    if (!remover) return;
    setRemovendo(true);
    try {
      await manageUserAccessMitra({ projectId: PROJECT_ID, email: remover, action: 'REMOVE' });
      await runSF(SF.conviteCancelar, { email: remover }).catch(() => undefined);
      avisar('success', `${remover} não acessa mais o Premier Insights.`);
      carregar(); onMudou();
    } catch (e) { avisar('error', `Não foi possível remover: ${getMitraErrorMessage(e)}`); }
    setRemovendo(false);
    setRemover(null);
  };

  const removiveis = pessoas.filter(p => p.EMAIL.toLowerCase() !== meuEmail.toLowerCase());

  return (
    <Card className="py-5">
      <CardHeader className="px-5 pb-4">
        <CardTitle>Convidar pessoas</CardTitle>
        <CardDescription>A pessoa recebe um e-mail, cria a própria senha e entra só no Premier Insights, com as áreas marcadas</CardDescription>
      </CardHeader>
      <div className="px-5 pt-4 flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-info-soft text-info-text text-[13px]">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Convidar e remover pessoas só funciona para quem desenvolve o produto no Mitra. Por isso esta parte aparece só para você.</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Input label="E-mail" type="email" placeholder="nome@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-wrap gap-4 pb-2">
            {areas.map(a => (
              <Checkbox key={a.codigo} label={a.nome} checked={marcadas.includes(a.codigo)}
                onChange={m => setMarcadas(v => m ? [...v, a.codigo] : v.filter(c => c !== a.codigo))} />
            ))}
          </div>
          <Button onClick={convidar} disabled={!valido || enviando}><Mail size={16} /> {enviando ? 'Enviando…' : 'Enviar convite'}</Button>
        </div>
        <p className="text-[12.5px] text-fg-subtle">Marque ao menos uma área. A pessoa entra como gerente; para torná-la diretora, depois do primeiro acesso, peça aqui no Agent.</p>

        {convites.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[14px] font-semibold text-fg">Aguardando o primeiro acesso</h3>
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>E-mail</th><th>Áreas</th><th>Convidado em</th><th></th></tr></thead>
                <tbody>
                  {convites.map(c => (
                    <tr key={c.EMAIL}>
                      <td>{c.EMAIL}</td>
                      <td>{(c.AREAS || '').split(',').filter(Boolean).map(nomeArea).join(', ') || '—'}</td>
                      <td className="tabular-nums">{fmtDataHora(c.CRIADO_EM)}</td>
                      <td className="text-right"><Button size="sm" variant="ghost" onClick={() => cancelarConvite(c.EMAIL)}>Cancelar convite</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {removiveis.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[14px] font-semibold text-fg">Tirar o acesso de alguém</h3>
            <div className="flex flex-wrap gap-2">
              {removiveis.map(p => (
                <Button key={p.ID} size="sm" variant="secondary" onClick={() => setRemover(p.EMAIL)}><UserMinus size={14} /> {p.EMAIL}</Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={remover !== null}
        onClose={() => setRemover(null)}
        onConfirm={confirmarRemocao}
        loading={removendo}
        title="Tirar o acesso?"
        message={`${remover} deixa de entrar no Premier Insights. Dá para convidar de novo depois.`}
        confirmLabel="Tirar o acesso"
      />
    </Card>
  );
}
