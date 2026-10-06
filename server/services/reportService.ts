import ExcelJS from 'exceljs';
import { db } from '../db/database.js';

// Brand colors
const GREEN_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF047857' }, // Emerald 700
};

const GREEN_TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF065F46' }, // Emerald 800
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

function applyStandardHeaders(sheet: ExcelJS.Worksheet, title: string, headers: string[], columnWidths: number[]) {
  // Title row
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, headers.length);
  titleRow.height = 36;
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = GREEN_TITLE_FILL;

  // Subtitle / generated date
  const metaRow = sheet.addRow([`Gerado em: ${new Date().toLocaleString('pt-BR')} | Sistema LOG MMS`]);
  sheet.mergeCells(2, 1, 2, headers.length);
  metaRow.height = 20;
  const metaCell = metaRow.getCell(1);
  metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]); // Blank row

  // Header row
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = GREEN_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_STYLE;
  });

  // Column widths
  columnWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function styleDataRow(row: ExcelJS.Row, index: number) {
  row.height = 22;
  const isEven = index % 2 === 0;
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = BORDER_STYLE;
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
    }
  });
}

export async function generateAlunosWorkbook(filter?: { obreiroId?: string; status?: string }): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Alunos');

  const headers = ['Nome', 'Obreiro responsável', 'Status'];
  const widths = [36, 32, 18];
  applyStandardHeaders(sheet, 'LOG MMS — Relatório Oficial de Alunos', headers, widths);

  const alunos = await db.alunos.find(filter);
  alunos.forEach((aluno, idx) => {
    const row = sheet.addRow([aluno.nome, aluno.obreiroNome || 'Não informado', aluno.status]);
    styleDataRow(row, idx);
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  return workbook;
}

export async function generateViagensWorkbook(filter?: { status?: string; alunoId?: string }): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Viagens');

  const headers = ['Aluno', 'Obreiro', 'Origem', 'Destino', 'Saída', 'Chegada', 'Empresa', 'Status'];
  const widths = [30, 26, 24, 24, 20, 20, 24, 18];
  applyStandardHeaders(sheet, 'LOG MMS — Relatório de Viagens e Rastreio', headers, widths);

  const viagens = await db.viagens.find(filter);
  viagens.forEach((v, idx) => {
    const saidaStr = `${v.dataSaida} ${v.horarioSaida}`;
    const chegadaStr = `${v.dataChegada} ${v.horarioChegada}`;
    const row = sheet.addRow([
      v.alunoNome,
      v.obreiroNome || 'Não informado',
      v.origem,
      v.destino,
      saidaStr,
      chegadaStr,
      v.empresa || 'Não informada',
      v.status,
    ]);
    styleDataRow(row, idx);
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  return workbook;
}

export async function generateDocumentosWorkbook(filter?: { tipo?: string; alunoId?: string }): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Documentos');

  const headers = ['Documento', 'Aluno', 'Viagem', 'Tipo', 'Data', 'Status'];
  const widths = [32, 28, 24, 22, 20, 18];
  applyStandardHeaders(sheet, 'LOG MMS — Relatório de Documentos e Bilhetes', headers, widths);

  const documentos = await db.documentos.find(filter);
  documentos.forEach((doc, idx) => {
    const dateStr = new Date(doc.createdAt).toLocaleDateString('pt-BR');
    const row = sheet.addRow([
      doc.titulo,
      doc.alunoNome || 'Sem vínculo',
      doc.viagemId ? `Viagem #${doc.viagemId.slice(-6)}` : 'Sem vínculo',
      doc.tipo,
      dateStr,
      doc.analiseStatus,
    ]);
    styleDataRow(row, idx);
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  return workbook;
}

export async function generateAuditoriaWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Auditoria');

  const headers = ['Data/Hora', 'Usuário', 'Função', 'Ação', 'Entidade', 'Detalhes', 'IP'];
  const widths = [22, 24, 16, 26, 18, 45, 18];
  applyStandardHeaders(sheet, 'LOG MMS — Trilha de Auditoria e Conformidade', headers, widths);

  const logs = await db.auditoria.find(500);
  logs.forEach((log, idx) => {
    const dateStr = new Date(log.timestamp).toLocaleString('pt-BR');
    const row = sheet.addRow([
      dateStr,
      log.userName,
      log.userRole,
      log.acao,
      log.entidade,
      log.detalhes || '-',
      log.ip || '-',
    ]);
    styleDataRow(row, idx);
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  return workbook;
}

export async function generateGeralWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Tab 1: Alunos
  const sheetAlunos = workbook.addWorksheet('Alunos');
  applyStandardHeaders(sheetAlunos, 'LOG MMS — Relatório Geral: Alunos', ['Nome', 'Obreiro responsável', 'Status'], [36, 32, 18]);
  const alunos = await db.alunos.find();
  alunos.forEach((a, idx) => {
    const row = sheetAlunos.addRow([a.nome, a.obreiroNome, a.status]);
    styleDataRow(row, idx);
  });

  // Tab 2: Viagens
  const sheetViagens = workbook.addWorksheet('Viagens');
  applyStandardHeaders(
    sheetViagens,
    'LOG MMS — Relatório Geral: Viagens',
    ['Aluno', 'Obreiro', 'Origem', 'Destino', 'Saída', 'Chegada', 'Empresa', 'Status'],
    [30, 26, 24, 24, 20, 20, 24, 18]
  );
  const viagens = await db.viagens.find();
  viagens.forEach((v, idx) => {
    const row = sheetViagens.addRow([
      v.alunoNome,
      v.obreiroNome,
      v.origem,
      v.destino,
      `${v.dataSaida} ${v.horarioSaida}`,
      `${v.dataChegada} ${v.horarioChegada}`,
      v.empresa,
      v.status,
    ]);
    styleDataRow(row, idx);
  });

  // Tab 3: Documentos
  const sheetDocs = workbook.addWorksheet('Documentos');
  applyStandardHeaders(
    sheetDocs,
    'LOG MMS — Relatório Geral: Documentos',
    ['Documento', 'Aluno', 'Viagem', 'Tipo', 'Data', 'Status'],
    [32, 28, 24, 22, 20, 18]
  );
  const docs = await db.documentos.find();
  docs.forEach((d, idx) => {
    const row = sheetDocs.addRow([
      d.titulo,
      d.alunoNome || 'Sem vínculo',
      d.viagemId ? `Viagem #${d.viagemId.slice(-6)}` : 'Sem vínculo',
      d.tipo,
      new Date(d.createdAt).toLocaleDateString('pt-BR'),
      d.analiseStatus,
    ]);
    styleDataRow(row, idx);
  });

  // Tab 4: Auditoria
  const sheetAuditoria = workbook.addWorksheet('Auditoria');
  applyStandardHeaders(
    sheetAuditoria,
    'LOG MMS — Relatório Geral: Auditoria',
    ['Data/Hora', 'Usuário', 'Função', 'Ação', 'Entidade', 'Detalhes'],
    [22, 24, 16, 26, 18, 45]
  );
  const logs = await db.auditoria.find(300);
  logs.forEach((l, idx) => {
    const row = sheetAuditoria.addRow([
      new Date(l.timestamp).toLocaleString('pt-BR'),
      l.userName,
      l.userRole,
      l.acao,
      l.entidade,
      l.detalhes || '-',
    ]);
    styleDataRow(row, idx);
  });

  return workbook;
}
