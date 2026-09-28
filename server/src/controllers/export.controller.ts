import type { Request, Response } from 'express';
import { generateCsvExport, generateExcelExport } from '../services/export.service.js';

/** GET /api/export/csv */
export async function exportCsvHandler(req: Request, res: Response) {
  const type = (req.query.type as 'pending' | 'ledger' | 'risk') || 'pending';
  const csv = await generateCsvExport(type);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=ium_${type}_export_${Date.now()}.csv`);
  res.send(csv);
}

/** GET /api/export/excel */
export async function exportExcelHandler(req: Request, res: Response) {
  const { start_date, end_date, month, year, method, status, search, type } = req.query;

  const buffer = await generateExcelExport({
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    month: month as string | undefined,
    year: year as string | undefined,
    method: method as string | undefined,
    status: status as string | undefined,
    search: search as string | undefined,
    type: (type as any) || 'ledger',
  });

  const fileName = `tuition_ledger_export_${Date.now()}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
}
