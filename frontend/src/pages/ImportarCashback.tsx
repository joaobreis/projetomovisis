import { useState } from 'react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { runSF, SF } from '../lib/api';
import { lerJsonCashback, TIPOS_CASHBACK, type TipoCashback } from '../lib/cashback';
import { fmtNum } from '../lib/format';
import { getMitraErrorMessage } from '../lib/utils';

const BLOCO = 300;

export default function ImportarCashback({ aberto, tipoInicial, onFechar, onImportado }: {
  aberto: boolean; tipoInicial: TipoCashback; onFechar: () => void; onImportado: (tipo: TipoCashback, qtd: number) => void;
}) {
  const [tipo, setTipo] = useState<TipoCashback>(tipoInicial);
  const [conteudo, setConteudo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [progresso, setProgresso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = () => { if (enviando) return; setConteudo(''); setErro(''); setAviso(''); setProgresso(''); onFechar(); };

  const importar = async () => {
    setErro(''); setAviso('');
    let resultado;
    try { resultado = lerJsonCashback(conteudo); } catch (e) { setErro(e instanceof SyntaxError ? 'O texto colado não é um JSON válido.' : getMitraErrorMessage(e)); return; }
    if (!resultado.linhas.length) {
      setErro(`Não reconheci os campos do JSON. Campos encontrados: ${resultado.camposDesconhecidos.slice(0, 15).join(', ') || 'nenhum'}.`);
      return;
    }
    setEnviando(true);
    const lote = `${tipo}-${Date.now()}`;
    try {
      for (let i = 0; i < resultado.linhas.length; i += BLOCO) {
        setProgresso(`Enviando ${fmtNum(Math.min(i + BLOCO, resultado.linhas.length))} de ${fmtNum(resultado.linhas.length)}…`);
        await runSF(SF.cashbackImportar, { tipo, lote, conteudo: JSON.stringify(resultado.linhas.slice(i, i + BLOCO)) });
      }
      setProgresso('Gravando…');
      await runSF(SF.cashbackAplicar);
      await runSF(SF.cashbackFinalizar, { tipo, lote });
      const extra = resultado.ignoradas ? ` ${fmtNum(resultado.ignoradas)} linhas sem loja ou cliente foram ignoradas.` : '';
      if (resultado.camposDesconhecidos.length) setAviso(`Campos não usados: ${resultado.camposDesconhecidos.slice(0, 10).join(', ')}.${extra}`);
      setConteudo(''); setProgresso('');
      onImportado(tipo, resultado.linhas.length);
    } catch (e) {
      setErro(`A importação parou: ${getMitraErrorMessage(e)}`);
      setProgresso('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={fechar} title="Colar JSON do cashback" size="lg">
      <div className="flex flex-col gap-4 px-5 py-5">
        <p className="text-[13px] text-fg-muted">
          Cole o JSON exportado do relatório de cashback do Movisis e escolha qual relatório ele é. Registros que já existem são atualizados.
          Em Disponível e Expira em 30 dias, o saldo das lojas do JSON é trocado pelo novo.
        </p>
        <div className="w-64">
          <Select label="Relatório" value={tipo} onChange={v => setTipo(v as TipoCashback)} options={TIPOS_CASHBACK.map(t => ({ value: t.codigo, label: t.nome }))} />
        </div>
        <textarea
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
          placeholder='Cole aqui o JSON, por exemplo: [{"Loja": "2.1", "Contato": 123, ...}]'
          spellCheck={false}
          disabled={enviando}
          className="h-64 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[12px] text-fg placeholder:text-fg-subtle"
        />
        {erro && <p className="text-[13px] text-danger-text">{erro}</p>}
        {aviso && <p className="text-[13px] text-fg-subtle">{aviso}</p>}
        <div className="flex items-center justify-end gap-2">
          {progresso && <span className="mr-auto text-[13px] text-fg-muted">{progresso}</span>}
          <Button variant="ghost" onClick={fechar} disabled={enviando}>Cancelar</Button>
          <Button onClick={importar} disabled={enviando || !conteudo.trim()}>{enviando ? 'Importando…' : 'Importar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
