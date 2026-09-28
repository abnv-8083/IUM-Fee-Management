import type { Request, Response } from 'express';
import { createFamily, deleteFamily, updateFamily } from '../services/family.service.js';

/** POST /api/families */
export async function createFamilyHandler(req: Request, res: Response) {
  const {
    family_code, parent_name, phone, email, address, notes,
    monthly_fee, fee_type, students, recorded_by,
  } = req.body;

  if (!family_code || !String(family_code).trim()) {
    return res.status(400).json({
      error:
        'Family Code / Ledger Number is mandatory. Please manually enter the existing ledger code or folio number.',
    });
  }
  if (!parent_name || !phone || !email || !monthly_fee) {
    return res
      .status(400)
      .json({ error: 'Parent name, phone, email, and monthly fee amount are required.' });
  }

  const result = await createFamily({
    family_code: String(family_code).trim(),
    parent_name,
    phone,
    email,
    address,
    notes,
    monthly_fee: Number(monthly_fee),
    fee_type: fee_type || 'tuition',
    students:
      Array.isArray(students) && students.length > 0
        ? students
        : [{ name: `${String(parent_name).split(' ')[0]} Jr`, grade: 'General Batch' }],
    recorded_by: recorded_by || 'Staff',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.status(201).json(result);
}

/** PUT /api/families/:id */
export async function updateFamilyHandler(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body.updates || req.body;
  const performed_by =
    req.body.performed_by || (req.body.updates && req.body.updates.performed_by) || 'Admin';

  const result = await updateFamily(id, updates || {}, performed_by);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }

  res.json(result);
}

/** DELETE /api/families/:id */
export async function deleteFamilyHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { performed_by } = req.body || {};

  const result = await deleteFamily(id, performed_by || 'Admin');
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }

  res.json(result);
}
