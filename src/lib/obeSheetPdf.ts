import jsPDF from 'jspdf';
import autoTable, { type CellDef, type HookData } from 'jspdf-autotable';
import { INDUSTRIAL_PLO_RUBRICS, INDUSTRIAL_PLO_RUBRIC_ORDER } from '@/data/industrialPloRubrics';
import {
  INTERNAL_EVALUATION_RUBRICS,
  INTERNAL_PRESENTATION_AVG_MAX,
  INTERNAL_TOTAL_MAX,
} from '@/data/internalEvaluationRubrics';

export type ObeSheetMeta = {
  title: string;
  instructor?: string;
  semester?: string;
  generatedAt?: string;
  studentCount?: number;
};

export type ObeSheetStudentRow = {
  serial: number;
  registrationNo: string;
  name: string;
  monthCells: (number | string)[];
  externalTotal: number;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  modernToolUsage: number;
  ethics: number;
  reportScore: number;
  presentationAvg: number;
  internalTotal: number;
  grandTotal: number;
  grade: string;
  ploPercentages: Record<string, number>;
};

const MONTH_PLO_LABELS = INDUSTRIAL_PLO_RUBRIC_ORDER.map(
  (key) => `${INDUSTRIAL_PLO_RUBRICS[key].label}\n${INDUSTRIAL_PLO_RUBRICS[key].plo}`
);

const PLO_PERCENT_KEYS = [...INDUSTRIAL_PLO_RUBRIC_ORDER];

const PLO_PERCENT_HEADERS = INDUSTRIAL_PLO_RUBRIC_ORDER.map(
  (key) => INDUSTRIAL_PLO_RUBRICS[key].plo
);

const MONTH_PLO_COUNT = INDUSTRIAL_PLO_RUBRIC_ORDER.length;
const MONTH_BLOCK = MONTH_PLO_COUNT * 4;
const INTERNAL_COL_COUNT = INTERNAL_EVALUATION_RUBRICS.length + 2;

/** Column layout: identity + industrial months + external + panel internal rubrics + totals + PLO %. */
const COL = {
  SNO: 0,
  REG: 1,
  NAME: 2,
  MONTH_START: 3,
  MONTH_COLS: MONTH_PLO_COUNT,
  MONTH_COUNT: 4,
  TOTAL_EXTERNAL: 3 + MONTH_BLOCK,
  INTERNAL_START: 3 + MONTH_BLOCK + 1,
  GRAND_TOTAL: 3 + MONTH_BLOCK + 1 + INTERNAL_COL_COUNT,
  GRADE: 3 + MONTH_BLOCK + 1 + INTERNAL_COL_COUNT + 1,
  PLO_PCT_START: 3 + MONTH_BLOCK + 1 + INTERNAL_COL_COUNT + 2,
  TOTAL: 3 + MONTH_BLOCK + 1 + INTERNAL_COL_COUNT + 2 + PLO_PERCENT_KEYS.length,
} as const;

const MONTH_STYLES = [
  { banner: [180, 198, 231] as [number, number, number], weight: [180, 198, 231] as [number, number, number], textOnBanner: 0 },
  { banner: [68, 114, 196] as [number, number, number], weight: [68, 114, 196] as [number, number, number], textOnBanner: 255 },
  { banner: [198, 224, 180] as [number, number, number], weight: [192, 80, 77] as [number, number, number], textOnBanner: 0 },
  { banner: [198, 224, 180] as [number, number, number], weight: [255, 192, 0] as [number, number, number], textOnBanner: 0 },
];

const INTERNAL_BLUE: [number, number, number] = [31, 78, 121];
const INTERNAL_GREEN: [number, number, number] = [84, 130, 53];
const TOTAL_EXTERNAL_YELLOW: [number, number, number] = [255, 255, 153];
const GRAND_ORANGE: [number, number, number] = [248, 203, 173];
const GRID: [number, number, number] = [0, 0, 0];

function fmtScore(value: number | string, digits = 1) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(digits);
}

function leadBlank(): CellDef[] {
  return [{ content: '' }, { content: '' }];
}

const MARKS_META_LABEL_LINES = ['Marks Category', 'Marks Weightage', 'Maximum Marks'] as const;

/** Left gutter labels — one merged vertical block with internal dividers (not three table rows). */
const MARKS_META_LABELS: CellDef = {
  content: '',
  rowSpan: 3,
  styles: {
    fontStyle: 'bold',
    halign: 'center',
    valign: 'middle',
    fontSize: 5,
    fillColor: [255, 255, 255],
  },
};

function buildExcelHeaders(): CellDef[][] {
  const row1: CellDef[] = [
    { ...MARKS_META_LABELS },
    ...leadBlank(),
  ];
  for (let m = 0; m < COL.MONTH_COUNT; m += 1) {
    const st = MONTH_STYLES[m];
    row1.push({
      content: `Month ${m + 1} (Industrial Supervisor Evaluation)`,
      colSpan: COL.MONTH_COLS,
      styles: {
        fillColor: st.banner,
        textColor: st.textOnBanner,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
    });
  }
  row1.push({ content: '' });
  row1.push({
    content: 'Internal Evaluation',
    colSpan: INTERNAL_COL_COUNT,
    styles: { fillColor: INTERNAL_BLUE, textColor: 255, fontStyle: 'bolditalic', halign: 'center' },
  });
  row1.push({ content: '' }, { content: '' });
  for (let i = 0; i < PLO_PERCENT_HEADERS.length; i += 1) row1.push({ content: '' });

  const row2: CellDef[] = [
    // rowSpan from row1 covers column 0
    ...leadBlank(),
  ];
  for (let m = 0; m < COL.MONTH_COUNT; m += 1) {
    const st = MONTH_STYLES[m];
    for (let i = 0; i < COL.MONTH_COLS; i += 1) {
      row2.push({
        content: '50',
        styles: { fillColor: st.weight, textColor: st.textOnBanner, halign: 'center' },
      });
    }
  }
  row2.push({ content: '50', styles: { fillColor: TOTAL_EXTERNAL_YELLOW, halign: 'center' } });
  for (let i = 0; i < INTERNAL_COL_COUNT; i += 1) {
    row2.push({ content: '', styles: { fillColor: INTERNAL_BLUE, textColor: 255 } });
  }
  // 100 above G.total (max 100)
  row2.push({
    content: '100',
    styles: { fillColor: GRAND_ORANGE, fontStyle: 'bold', halign: 'center' },
  });
  row2.push({ content: '', styles: { fillColor: GRAND_ORANGE } });
  for (let i = 0; i < PLO_PERCENT_HEADERS.length; i += 1) row2.push({ content: '' });

  const row3: CellDef[] = [
    // rowSpan from row1 covers column 0
    ...leadBlank(),
  ];
  for (let m = 0; m < COL.MONTH_COUNT; m += 1) {
    const st = MONTH_STYLES[m];
    for (let i = 0; i < COL.MONTH_COLS; i += 1) {
      row3.push({
        content: '10',
        styles: { fillColor: st.weight, textColor: st.textOnBanner, halign: 'center' },
      });
    }
  }
  row3.push({ content: '50', styles: { fillColor: TOTAL_EXTERNAL_YELLOW, halign: 'center', fontStyle: 'bold' } });
  const internalMax = [
    ...INTERNAL_EVALUATION_RUBRICS.map((r) => String(r.max)),
    String(INTERNAL_PRESENTATION_AVG_MAX),
    String(INTERNAL_TOTAL_MAX),
  ];
  internalMax.forEach((val) => {
    row3.push({
      content: val,
      styles: {
        fillColor: INTERNAL_GREEN,
        textColor: 255,
        fontStyle: 'bolditalic',
        halign: 'center',
      },
    });
  });
  row3.push({
    content: '100',
    styles: { fillColor: GRAND_ORANGE, fontStyle: 'bolditalic', halign: 'center' },
  });
  row3.push({
    content: '',
    styles: { fillColor: GRAND_ORANGE, fontStyle: 'bolditalic', halign: 'center' },
  });
  for (let i = 0; i < PLO_PERCENT_HEADERS.length; i += 1) row3.push({ content: '' });

  const row4: CellDef[] = [
    { content: 'S.No.', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: 'Registration No', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: 'Name', styles: { fontStyle: 'bold', halign: 'center' } },
  ];
  for (let m = 0; m < COL.MONTH_COUNT; m += 1) {
    const st = MONTH_STYLES[m];
    for (const label of MONTH_PLO_LABELS) {
      row4.push({
        content: label,
        styles: {
          fillColor: st.weight,
          textColor: st.textOnBanner,
          fontStyle: 'italic',
          fontSize: 4,
          halign: 'center',
          valign: 'middle',
        },
      });
    }
  }
  row4.push({
    content: 'Total\nExternal',
    styles: { fillColor: TOTAL_EXTERNAL_YELLOW, fontStyle: 'bold', halign: 'center' },
  });
  const internalLabels = [
    ...INTERNAL_EVALUATION_RUBRICS.map((r) => r.label),
    'Avg\n(AG:AJ)',
    'Total\nInternal',
  ];
  internalLabels.forEach((label) => {
    row4.push({
      content: label,
      styles: {
        fillColor: INTERNAL_GREEN,
        textColor: 255,
        fontStyle: 'bolditalic',
        halign: 'center',
        fontSize: 4,
      },
    });
  });
  row4.push({
    content: 'G.total',
    styles: { fillColor: GRAND_ORANGE, fontStyle: 'bolditalic', halign: 'center' },
  });
  row4.push({
    content: 'Grade',
    styles: { fillColor: GRAND_ORANGE, fontStyle: 'bolditalic', halign: 'center' },
  });
  PLO_PERCENT_HEADERS.forEach((label) => {
    row4.push({ content: label, styles: { fontStyle: 'bolditalic', halign: 'center', fontSize: 4 } });
  });

  return [row1, row2, row3, row4];
}

function studentToTableRow(row: ObeSheetStudentRow): string[] {
  const ploPct = row.ploPercentages || {};
  const cells = new Array<string>(COL.TOTAL).fill('');

  cells[COL.SNO] = String(row.serial);
  cells[COL.REG] = row.registrationNo;
  cells[COL.NAME] = row.name;

  row.monthCells.forEach((c, i) => {
    cells[COL.MONTH_START + i] = c === '' ? '' : fmtScore(c, 1);
  });

  cells[COL.TOTAL_EXTERNAL] = fmtScore(row.externalTotal, 2);

  const internalByKey: Record<string, number> = {
    content: row.content,
    visuals: row.visuals,
    presentationSkills: row.presentationSkills,
    organization: row.organization,
    handlingOfQuestions: row.handlingOfQuestions,
    modernToolUsage: row.modernToolUsage,
    ethics: row.ethics,
    reportScore: row.reportScore,
  };
  INTERNAL_EVALUATION_RUBRICS.forEach((rubric, i) => {
    cells[COL.INTERNAL_START + i] = fmtScore(internalByKey[rubric.key] ?? 0, 2);
  });
  cells[COL.INTERNAL_START + INTERNAL_EVALUATION_RUBRICS.length] = fmtScore(row.presentationAvg, 2);
  cells[COL.INTERNAL_START + INTERNAL_EVALUATION_RUBRICS.length + 1] = fmtScore(row.internalTotal, 2);
  cells[COL.GRAND_TOTAL] = fmtScore(row.grandTotal, 1);
  cells[COL.GRADE] = row.grade;

  PLO_PERCENT_KEYS.forEach((key, i) => {
    cells[COL.PLO_PCT_START + i] = fmtScore(ploPct[key] ?? 0, 2);
  });

  return cells;
}

function paintBodyCell(data: HookData) {
  if (data.section !== 'body') return;

  const col = data.column.index;
  data.cell.styles.lineWidth = 0.25;
  data.cell.styles.lineColor = GRID;
  data.cell.styles.halign = 'center';
  data.cell.styles.valign = 'middle';

  if (col === COL.REG || col === COL.NAME) {
    data.cell.styles.halign = 'left';
    data.cell.styles.fillColor = [255, 255, 255];
    return;
  }

  if (col === COL.TOTAL_EXTERNAL) {
    data.cell.styles.fillColor = TOTAL_EXTERNAL_YELLOW;
    return;
  }

  if (col >= COL.INTERNAL_START && col < COL.GRAND_TOTAL) {
    data.cell.styles.fillColor = [255, 255, 255];
    return;
  }

  if (col === COL.GRAND_TOTAL || col === COL.GRADE) {
    data.cell.styles.fillColor = GRAND_ORANGE;
    data.cell.styles.fontStyle = 'bold';
    return;
  }

  if (col >= COL.MONTH_START && col < COL.TOTAL_EXTERNAL) {
    data.cell.styles.fillColor = [255, 255, 255];
    return;
  }

  data.cell.styles.fillColor = [255, 255, 255];
}

function paintHeadCell(data: HookData) {
  if (data.section !== 'head') return;
  data.cell.styles.lineWidth = 0.25;
  data.cell.styles.lineColor = GRID;
}

function drawMarksMetaLabelBlock(doc: jsPDF, data: HookData) {
  if (data.section !== 'head' || data.row.index !== 0 || data.column.index !== COL.SNO) return;
  const raw = data.cell.raw as CellDef | undefined;
  if (!raw || raw.rowSpan !== 3) return;

  const { x, y, width, height } = data.cell;
  const bandH = height / MARKS_META_LABEL_LINES.length;

  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.25);
  for (let i = 1; i < MARKS_META_LABEL_LINES.length; i += 1) {
    const lineY = y + bandH * i;
    doc.line(x, lineY, x + width, lineY);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  MARKS_META_LABEL_LINES.forEach((label, i) => {
    doc.text(label, x + width / 2, y + bandH * i + bandH / 2, {
      align: 'center',
      baseline: 'middle',
    });
  });
}

function buildTitleLine(meta: ObeSheetMeta) {
  const parts = [meta.title];
  if (meta.instructor) parts.push(`Instructor: ${meta.instructor}`);
  if (meta.semester) parts.push(`Class and Semester: ${meta.semester}`);
  return parts.join('  -   ');
}

export function generateObeSheetPdf(meta: ObeSheetMeta, students: ObeSheetStudentRow[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    // A3 can become too tight once industrial rubrics + PLO% are added.
    // Use A2 so the full OBE sheet fits across the page.
    format: 'a2',
  });

  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const title = buildTitleLine(meta);
  doc.text(title, pageW / 2, 22, { align: 'center', maxWidth: pageW - 40 });

  if (!students.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      'No students qualify yet. Requires at least one internal final grade (Completed list).',
      28,
      40
    );
    return doc;
  }

  const availableW = pageW - 12; // margins are set below
  const baseWidths = new Array<number>(COL.TOTAL).fill(18);
  baseWidths[COL.SNO] = 52;
  baseWidths[COL.REG] = 78;
  baseWidths[COL.NAME] = 64;
  baseWidths[COL.GRADE] = 30;
  baseWidths[COL.GRAND_TOTAL] = 34;
  // PLO % columns need a bit more space so headers (PLO12) don't clip.
  for (let i = 0; i < PLO_PERCENT_HEADERS.length; i += 1) {
    baseWidths[COL.PLO_PCT_START + i] = 24;
  }

  const baseSum = baseWidths.reduce((s, n) => s + n, 0);
  const scale = baseSum > 0 ? availableW / baseSum : 1;

  const columnStyles: Record<number, { cellWidth: number; fontSize?: number }> = {};
  for (let i = 0; i < COL.TOTAL; i += 1) {
    columnStyles[i] = {
      cellWidth: Math.max(10, baseWidths[i] * scale),
      fontSize: 4.2,
    };
  }

  autoTable(doc, {
    head: buildExcelHeaders(),
    body: students.map(studentToTableRow),
    startY: 30,
    margin: { left: 6, right: 6 },
    theme: 'grid',
    showHead: 'everyPage',
    tableLineWidth: 0.35,
    tableLineColor: GRID,
    styles: {
      fontSize: 4.2,
      cellPadding: 1.0,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.25,
      lineColor: GRID,
      fillColor: [255, 255, 255],
      textColor: 0,
    },
    bodyStyles: {
      fontSize: 4.2,
    },
    columnStyles,
    didParseCell: (data) => {
      paintHeadCell(data);
      paintBodyCell(data);
    },
    didDrawCell: (data) => {
      drawMarksMetaLabelBlock(doc, data);
    },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
        pageW - 70,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  return doc;
}

export function downloadObeSheetPdf(meta: ObeSheetMeta, students: ObeSheetStudentRow[]) {
  const doc = generateObeSheetPdf(meta, students);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`OBE-Sheet-${date}.pdf`);
}
