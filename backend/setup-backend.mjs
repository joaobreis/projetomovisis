import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import { configureSdkMitra, runDdlMitra, runDmlMitra, createIntegrationMitra, listIntegrationsMitra, testIntegrationMitra } from 'mitra-sdk';

configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = parseInt(process.env.MITRA_PROJECT_ID);
if (projectId !== 67129) throw new Error('projeto errado');

const ddl = [
`CREATE TABLE LOJAS (
  ID INT PRIMARY KEY,
  CODIGO VARCHAR(5) NOT NULL,
  NOME VARCHAR(100) NOT NULL,
  CNPJ VARCHAR(20),
  GRUPO VARCHAR(20),
  TEM_OFICINA BOOLEAN DEFAULT TRUE,
  UNIQUE KEY UK_LOJAS_CODIGO (CODIGO)
) COMMENT='Lojas da Auto Premier; ID = ID da loja no Movisis (FILTRO_LOJAS). RETENCAO: tudo, cadastro'`,
`CREATE TABLE AREAS (
  ID INT PRIMARY KEY,
  CODIGO VARCHAR(20) NOT NULL,
  NOME VARCHAR(50) NOT NULL,
  DISPONIVEL BOOLEAN DEFAULT TRUE,
  ORDEM INT,
  UNIQUE KEY UK_AREAS_CODIGO (CODIGO)
) COMMENT='Areas do sistema (Novos, Seminovos, Oficina, Pecas, Financeiro). RETENCAO: tudo, cadastro'`,
`CREATE TABLE USUARIO_AREA (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  USUARIO_ID INT NOT NULL,
  AREA_ID INT NOT NULL,
  CRIADO_EM VARCHAR(19),
  UNIQUE KEY UK_USUARIO_AREA (USUARIO_ID, AREA_ID),
  FOREIGN KEY (AREA_ID) REFERENCES AREAS(ID)
) COMMENT='Areas liberadas para cada usuario (INT_USER.ID). RETENCAO: tudo, permissoes'`,
`CREATE TABLE PARAMETROS (
  CHAVE VARCHAR(50) PRIMARY KEY,
  VALOR VARCHAR(200),
  DESCRICAO VARCHAR(300)
) COMMENT='Parametros de regra de negocio. RETENCAO: tudo, configuracao'`,
`CREATE TABLE VENDAS (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  LOJA_ID INT NOT NULL,
  PROPOSTA INT NOT NULL,
  CLIENTE VARCHAR(200),
  STATUS_ENTREGA VARCHAR(40),
  TIPO_VENDA VARCHAR(40),
  CADASTRO_APP BOOLEAN,
  VEICULO VARCHAR(30),
  NOVO_USADO CHAR(1),
  DATA_PROPOSTA VARCHAR(10),
  DATA_NF VARCHAR(10),
  DATA_AGENDADA VARCHAR(10),
  DATA_ENTREGA VARCHAR(10),
  MARCA VARCHAR(20),
  MODELO VARCHAR(150),
  COR VARCHAR(60),
  CHASSI VARCHAR(30),
  PLACA VARCHAR(15),
  USADO_TROCA BOOLEAN,
  VENDEDOR VARCHAR(150),
  CONSULTOR_ENTREGA VARCHAR(150),
  ATUALIZADO_EM VARCHAR(19),
  UNIQUE KEY UK_VENDAS (LOJA_ID, PROPOSTA),
  KEY IX_VENDAS_NF (DATA_NF),
  FOREIGN KEY (LOJA_ID) REFERENCES LOJAS(ID)
) COMMENT='Vendas de veiculos (API 8 Movisis, periodo por Faturamento). RETENCAO: tudo, historico de vendas para relatorios'`,
`CREATE TABLE STG_VENDAS (
  LOJA_CODIGO VARCHAR(5), PROPOSTA INT, CLIENTE VARCHAR(200), STATUS_ENTREGA VARCHAR(40), TIPO_VENDA VARCHAR(40),
  CADASTRO_APP BOOLEAN, VEICULO VARCHAR(30), NOVO_USADO CHAR(1), DATA_PROPOSTA VARCHAR(10), DATA_NF VARCHAR(10),
  DATA_AGENDADA VARCHAR(10), DATA_ENTREGA VARCHAR(10), MARCA VARCHAR(20), MODELO VARCHAR(150), COR VARCHAR(60),
  CHASSI VARCHAR(30), PLACA VARCHAR(15), USADO_TROCA BOOLEAN, VENDEDOR VARCHAR(150), CONSULTOR_ENTREGA VARCHAR(150)
) COMMENT='Area de passagem da carga de VENDAS. RETENCAO: esvaziada a cada carga'`,
`CREATE TABLE ORDENS_SERVICO (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  LOJA_ID INT NOT NULL,
  NRO_OS INT NOT NULL,
  CODIGO_DMS INT,
  CLIENTE VARCHAR(200),
  SITUACAO VARCHAR(40),
  VIA_APP BOOLEAN,
  CHECKLIST BOOLEAN,
  AVALIADO BOOLEAN,
  DATA_ABERTURA VARCHAR(19),
  DATA_ENCERRAMENTO VARCHAR(19),
  KM INT,
  PLACA VARCHAR(15),
  CHASSI VARCHAR(30),
  MODELO VARCHAR(150),
  CONSULTOR VARCHAR(150),
  DEPARTAMENTO VARCHAR(20),
  CATEGORIA VARCHAR(100),
  TOTAL_PECAS DECIMAL(14,2),
  TOTAL_SERVICOS DECIMAL(14,2),
  TOTAL_OS DECIMAL(14,2),
  EM_ANDAMENTO BOOLEAN DEFAULT FALSE,
  ATUALIZADO_EM VARCHAR(19),
  UNIQUE KEY UK_OS (LOJA_ID, NRO_OS),
  KEY IX_OS_ABERTURA (DATA_ABERTURA),
  FOREIGN KEY (LOJA_ID) REFERENCES LOJAS(ID)
) COMMENT='Ordens de servico da oficina (API 5 Movisis). RETENCAO: tudo, historico da oficina para relatorios'`,
`CREATE TABLE STG_OS (
  ORIGEM VARCHAR(12), LOJA_CODIGO VARCHAR(5), NRO_OS INT, CODIGO_DMS INT, CLIENTE VARCHAR(200), SITUACAO VARCHAR(40),
  VIA_APP BOOLEAN, CHECKLIST BOOLEAN, AVALIADO BOOLEAN, DATA_ABERTURA VARCHAR(19), DATA_ENCERRAMENTO VARCHAR(19),
  KM INT, PLACA VARCHAR(15), CHASSI VARCHAR(30), MODELO VARCHAR(150), CONSULTOR VARCHAR(150), DEPARTAMENTO VARCHAR(20),
  CATEGORIA VARCHAR(100), TOTAL_PECAS DECIMAL(14,2), TOTAL_SERVICOS DECIMAL(14,2), TOTAL_OS DECIMAL(14,2)
) COMMENT='Area de passagem da carga de ORDENS_SERVICO. RETENCAO: esvaziada a cada carga'`,
`CREATE TABLE ATUALIZACOES (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  INICIO VARCHAR(19),
  FIM VARCHAR(19),
  STATUS VARCHAR(10),
  JANELA VARCHAR(30),
  VENDAS_LINHAS INT,
  OS_LINHAS INT,
  LOJAS_FALHA VARCHAR(60),
  DETALHE VARCHAR(2000)
) COMMENT='Log das atualizacoes vindas do Movisis. RETENCAO: 90 dias'`,
];

const dml = [
`INSERT INTO LOJAS (ID, CODIGO, NOME, CNPJ, GRUPO, TEM_OFICINA) VALUES
 (1,'2.1','Auto Premier Jeep/RAM Joinville','16.099.559/0001-50','Jeep',TRUE),
 (2,'3.1','Premier Seminovos Joinville','48.434.539/0001-85','Jeep',FALSE),
 (3,'4.1','KIA Blumenau','00.208.817/0001-50','Kia',TRUE),
 (4,'4.2','KIA Florianópolis','00.208.817/0004-00','Kia',TRUE),
 (5,'4.3','KIA Balneário Camboriú','00.208.817/0003-11','Kia',TRUE),
 (6,'4.4','KIA Joinville','00.208.817/0002-30','Kia',TRUE),
 (7,'4.5','KIA Jaraguá do Sul','00.208.817/0009-07','Kia',TRUE)`,
`INSERT INTO AREAS (ID, CODIGO, NOME, DISPONIVEL, ORDEM) VALUES
 (1,'NOVOS','Novos',TRUE,1),(2,'SEMINOVOS','Seminovos',TRUE,2),(3,'OFICINA','Oficina',TRUE,3),
 (4,'PECAS','Peças',FALSE,4),(5,'FINANCEIRO','Financeiro',FALSE,5)`,
`INSERT INTO PARAMETROS (CHAVE, VALOR, DESCRICAO) VALUES
 ('CRITERIO_SEMINOVOS','LOJA','LOJA = vendas da loja 3.1 Premier Seminovos; VEICULO = veiculo usado (U no codigo do veiculo); AMBOS = loja 3.1 ou veiculo usado'),
 ('LOJA_SEMINOVOS','2','ID da loja de seminovos')`,
];

for (const sql of ddl) { const r = await runDdlMitra({ projectId, sql }); console.log('DDL', sql.slice(13, 40).trim(), r.status ?? 'ok'); }
for (const sql of dml) { const r = await runDmlMitra({ projectId, sql }); console.log('DML', sql.slice(12, 30).trim(), JSON.stringify(r.result ?? r).slice(0, 80)); }

const ints = await listIntegrationsMitra({ projectId });
if (!(ints.result || []).some(i => i.slug === 'movisis')) {
  const raw = fs.readFileSync(os.homedir() + '/.mitra/segredos/movisis_autopremier', 'utf8').trim();
  const i = raw.indexOf(':');
  const r = await createIntegrationMitra({
    projectId, name: 'Movisis', slug: 'movisis', blueprintId: null, blueprintType: 'HTTP_REQUEST', authType: 'STATIC_KEY',
    credentials: { base_url: 'https://ws.movisis.com.br', username: raw.slice(0, i), password: raw.slice(i + 1) },
    authorizationConfig: { type: 'basic', config: { username: '{{username}}', password: '{{password}}' } },
  });
  console.log('integracao', JSON.stringify(r.result ?? r).slice(0, 200).replace(/"password":"[^"]*"/, '"password":"***"'));
}
console.log('ok');
