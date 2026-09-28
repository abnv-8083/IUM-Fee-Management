import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { exportCsvHandler, exportExcelHandler } from '../controllers/export.controller.js';

const router = Router();

router.get('/csv', asyncHandler(exportCsvHandler));
router.get('/excel', asyncHandler(exportExcelHandler));

export default router;
