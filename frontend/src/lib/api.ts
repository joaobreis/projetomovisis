import { executeServerFunctionMitra } from 'mitra-interactions-sdk';
import { getMitraErrorMessage } from './utils';

const PROJECT_ID = Number(import.meta.env.VITE_MITRA_PROJECT_ID);

export const SF = {
  sessao: 3,
  vendasPainel: 4,
  vendasLista: 5,
  oficinaPainel: 6,
  oficinaAtrasadas: 7,
  permissoesListar: 8,
  permissoesSalvar: 9,
  parametroSalvar: 10,
  convitesListar: 18,
  conviteSalvar: 19,
  conviteCancelar: 20,
  conviteAplicar: 21,
  oficinaCompradores: 22,
  cashbackPainel: 23,
  cashbackLista: 24,
  cashbackImportar: 25,
  cashbackFinalizar: 26,
  cashbackAplicar: 27,
} as const;

export async function callSF<T = Record<string, any>>(serverFunctionId: number, input: Record<string, unknown> = {}): Promise<T[]> {
  const res: any = await executeServerFunctionMitra({ projectId: PROJECT_ID, serverFunctionId, input });
  if (res?.result?.executionStatus === 'FAILED') throw new Error(getMitraErrorMessage(res.result.error));
  let output = res?.result?.output;
  if (typeof output === 'string') {
    try { output = JSON.parse(output); } catch { /* texto */ }
  }
  if (Array.isArray(output?.rows)) return output.rows as T[];
  if (Array.isArray(output?.result)) return output.result as T[];
  return [];
}

export async function runSF(serverFunctionId: number, input: Record<string, unknown> = {}): Promise<void> {
  const res: any = await executeServerFunctionMitra({ projectId: PROJECT_ID, serverFunctionId, input });
  if (res?.result?.executionStatus === 'FAILED') throw new Error(getMitraErrorMessage(res.result.error));
}
