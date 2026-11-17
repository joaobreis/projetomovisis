import type { ReactNode } from 'react';
import compassBranco from '../../assets/marca/compass-branco.webp';
import compassPreto from '../../assets/marca/compass-preto.webp';
import kiaEv9 from '../../assets/marca/kia-ev9.webp';
import kiaPicape from '../../assets/marca/kia-picape.webp';
import kiaSuv from '../../assets/marca/kia-suv.webp';
import kiaCompacto from '../../assets/marca/kia-compacto.webp';

const CARROS = { compassBranco, compassPreto, kiaEv9, kiaPicape, kiaSuv, kiaCompacto } as const;

export type CarroFaixa = keyof typeof CARROS;

interface FaixaProps {
  sobretitulo?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  carro?: CarroFaixa;
  acao?: ReactNode;
  children?: ReactNode;
}

export default function Faixa({ sobretitulo = 'Grupo Auto Premier', titulo, descricao, carro = 'compassBranco', acao, children }: FaixaProps) {
  return (
    <section className="faixa-premier animate-fadeIn">
      <img src={CARROS[carro]} alt="" aria-hidden="true" className="faixa-carro hidden md:block" />
      <div className="relative z-10 flex flex-col gap-2.5 px-6 py-6 md:px-8 md:py-7 md:max-w-[56%]">
        <span className="faixa-sobretitulo">{sobretitulo}</span>
        <h1 className="text-[26px] md:text-[30px] leading-tight font-semibold tracking-tight text-fg">{titulo}</h1>
        {descricao && <p className="text-[13px] leading-relaxed text-fg-muted">{descricao}</p>}
        {children && <div className="pt-1">{children}</div>}
        {acao && <div className="pt-2">{acao}</div>}
      </div>
    </section>
  );
}
