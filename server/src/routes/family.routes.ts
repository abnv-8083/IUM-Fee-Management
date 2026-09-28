import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createFamilyHandler,
  deleteFamilyHandler,
  updateFamilyHandler,
} from '../controllers/family.controller.js';

const router = Router();

router.post('/', asyncHandler(createFamilyHandler));
router.put('/:id', asyncHandler(updateFamilyHandler));
router.delete('/:id', asyncHandler(deleteFamilyHandler));

export default router;
