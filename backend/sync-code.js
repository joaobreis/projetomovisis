const mitra = require('mitra-sdk');
const projectId = Number(process.env.MITRA_PROJECT_ID);
const SF = __SF__;
const TODAS = '1,2,3,4,5,6,7';
const LOJA_POR_CODIGO = { '2.1': 1, '3.1': 2, '4.1': 3, '4.2': 4, '4.3': 5, '4.4': 6, '4.5': 7 };

const agoraBr = () => new Date(Date.now() - 3 * 3600 * 1000);
const iso19 = d => d.toISOString().slice(0, 19);
const br = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
const reData = /^\d{2}\/\d{2}\/\d{4}$/;
const brParaIso = s => { if (!s) return null; const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const isoData = s => (!s || String(s).startsWith('0001')) ? null : String(s).slice(0, 19);
const simNao = v => String(v || '').toLowerCase().startsWith('s');
const txt = (v, n) => v == null ? null : String(v).slice(0, n);
const num = v => Number(v) || 0;
const novoUsado = v => /U/.test(String(v || '').slice(1, 4)) ? 'U' : 'N';

async function sf(id, input) {
  const r = await mitra.executeServerFunctionMitra({ projectId, serverFunctionId: id, input });
  if (r?.result?.executionStatus === 'FAILED') throw new Error('SF ' + id + ': ' + JSON.stringify(r.result.error));
  return r?.result?.output;
}

async function movisis(idApi, dados) {
  const r = await mitra.callIntegrationMitra({
    projectId, connection: 'movisis', method: 'POST', endpoint: '/Api/Integracao.ashx',
    body: { DominioServidor: 'autopremier', IdApi: idApi, Dados: Object.entries(dados).map(([Nome, Valor]) => ({ Nome, Valor: String(Valor) })) },
  });
  const res = r?.result ?? r;
  let body = res?.body ?? res;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
  const status = res?.statusCode;
  if (status === 401 || status === 403) throw Object.assign(new Error('Credencial recusada pelo Movisis (HTTP ' + status + ')'), { credencial: true });
  if (!body || body.Sucesso !== true) throw new Error('API ' + idApi + ': ' + (body?.MensagemErro || ('HTTP ' + status)));
  return body.Data;
}

async function buscar(idApi, dados, extrair) {
  try { return { linhas: extrair(await movisis(idApi, { ...dados, FILTRO_LOJAS: TODAS })), ok: TODAS.split(','), falhas: [] }; }
  catch (e) {
    if (e.credencial) throw e;
    const linhas = [], ok = [], falhas = [];
    for (const loja of TODAS.split(',')) {
      try { linhas.push(...extrair(await movisis(idApi, { ...dados, FILTRO_LOJAS: loja }))); ok.push(loja); }
      catch (e2) { if (e2.credencial) throw e2; falhas.push(loja + ': ' + e2.message.slice(0, 80)); }
    }
    return { linhas, ok, falhas };
  }
}

async function gravar(tipo, registros) {
  for (let i = 0; i < registros.length; i += 400) {
    await sf(SF.gravarLote, { tipo, conteudo: JSON.stringify(registros.slice(i, i + 400)) });
  }
}
const b01 = v => v ? 1 : 0;

const inicio = iso19(agoraBr());
const hoje = agoraBr();
let dtaIni = br(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1)));
let dtaFim = br(hoje);
if (event && event.dtaIni && event.dtaFim) {
  if (!reData.test(event.dtaIni) || !reData.test(event.dtaFim)) return { error: 'Datas no formato dd/MM/aaaa' };
  dtaIni = event.dtaIni; dtaFim = event.dtaFim;
}
const janela = dtaIni + ' a ' + dtaFim;
const log = [];
let vendasLinhas = 0, osLinhas = 0, falhasLojas = new Set(), status = 'OK';

try {
  await sf(SF.limparStg, {});

  const v = await buscar(8, { TIPO_PERIODO_AGENDAMENTO: 'Faturamento', DTA_INICIAL: dtaIni, DTA_FINAL: dtaFim }, d => d?.Entregas || []);
  v.falhas.forEach(f => { falhasLojas.add(f.split(':')[0]); log.push('Vendas ' + f); });
  const vendas = v.linhas.filter(x => LOJA_POR_CODIGO[x['Loja Entrega']]).map(x => ({
    LOJA_CODIGO: x['Loja Entrega'], PROPOSTA: num(x.Proposta), CLIENTE: txt(x['Nome Cliente'], 200),
    STATUS_ENTREGA: txt(x['Status Entrega'], 40), TIPO_VENDA: txt(x['Tipo Venda'], 40), CADASTRO_APP: b01(simNao(x['Cadastro App'])),
    VEICULO: txt(x['Veículo'], 30), NOVO_USADO: x['Loja Entrega'] === '3.1' ? 'U' : novoUsado(x['Veículo']), DATA_PROPOSTA: brParaIso(x['Data Proposta']),
    DATA_NF: brParaIso(x['Data Nota Fiscal']), DATA_AGENDADA: brParaIso(x['Data Agendada']), DATA_ENTREGA: brParaIso(x['Data Entrega']),
    MARCA: txt(x.Marca, 20), MODELO: txt(x['Descrição Modelo'], 150), COR: txt(x.Cor, 60), CHASSI: txt(x.Chassi, 30), PLACA: txt(x.Placa, 15),
    USADO_TROCA: b01(simNao(x['Usado Troca'])), VENDEDOR: txt(x['Nome Vendedor'], 150), CONSULTOR_ENTREGA: txt(x['Consultor de Entrega'], 150),
  }));
  await gravar('VENDAS', vendas);
  vendasLinhas = vendas.length;
  const and = await buscar(5, { TIPO_DATA: 0, DTA_INICIAL: '01/01/2015', DTA_FINAL: dtaFim }, d => d?.OrdensServico || []);
  const enc = await buscar(5, { TIPO_DATA: 2, DTA_INICIAL: dtaIni, DTA_FINAL: dtaFim }, d => d?.OrdensServico || []);
  [...and.falhas.map(f => 'OS em andamento ' + f), ...enc.falhas.map(f => 'OS encerradas ' + f)].forEach(f => log.push(f));
  and.falhas.concat(enc.falhas).forEach(f => falhasLojas.add(f.split(':')[0]));
  const vistos = new Set();
  const mapOs = (x, origem) => ({
    ORIGEM: origem, LOJA_CODIGO: x.Loja, NRO_OS: num(x.NroOs), CODIGO_DMS: num(x.CodigoDMS), CLIENTE: txt(x.NomeCliente, 200),
    SITUACAO: txt(x.Situacao, 40), VIA_APP: b01(x.ViaApp), CHECKLIST: b01(x.Checklist), AVALIADO: b01(x.Avaliado),
    DATA_ABERTURA: isoData(x.DataAbertura), DATA_ENCERRAMENTO: isoData(x.DataEncerramento), KM: num(x.Km), PLACA: txt(x.Placa, 15),
    CHASSI: txt(x.Chassi, 30), MODELO: txt(x.Modelo, 150), CONSULTOR: txt(x.NomeConsultor, 150), DEPARTAMENTO: txt(x.Departamento, 20),
    CATEGORIA: txt(x.Categoria, 100), TOTAL_PECAS: num(x.TotalPecas), TOTAL_SERVICOS: num(x.TotalServicos), TOTAL_OS: num(x.TotalOs),
  });
  const os = [];
  for (const x of and.linhas) { const k = x.Loja + '/' + x.NroOs; if (LOJA_POR_CODIGO[x.Loja] && !vistos.has(k)) { vistos.add(k); os.push(mapOs(x, 'ANDAMENTO')); } }
  for (const x of enc.linhas) { const k = x.Loja + '/' + x.NroOs; if (LOJA_POR_CODIGO[x.Loja] && !vistos.has(k)) { vistos.add(k); os.push(mapOs(x, 'ENCERRADA')); } }
  await gravar('OS', os);
  osLinhas = os.length;
  await sf(SF.registrar, { inicio, fim: '', status: 'CARGA', janela, janelaIni: brParaIso(dtaIni), janelaFim: brParaIso(dtaFim),
    lojasVendas: v.ok.join(','), lojasOs: and.ok.filter(l => enc.ok.includes(l)).join(','), vendas: vendasLinhas, os: osLinhas, lojasFalha: '', detalhe: '' });
  await sf(SF.aplicarCarga, {});
  if (falhasLojas.size) status = 'PARCIAL';
} catch (e) {
  status = e.credencial ? 'CREDENCIAL' : 'FALHA';
  log.push(e.message);
}

await sf(SF.registrar, {
  inicio, fim: iso19(agoraBr()), status, janela, janelaIni: '', janelaFim: '', lojasVendas: '', lojasOs: '',
  vendas: vendasLinhas, os: osLinhas, lojasFalha: [...falhasLojas].join(','), detalhe: log.join(' | ').slice(0, 1900),
});
return { status, janela, vendas: vendasLinhas, os: osLinhas, falhas: log };
