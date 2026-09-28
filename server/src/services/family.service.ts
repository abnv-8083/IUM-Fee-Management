import type { Family, FeePlan, Payment, Student } from '../types/index.js';
import {
  FamilyModel,
  FeePlanModel,
  StudentModel,
  PaymentModel,
  generateId,
  toPlain,
} from '../models/index.js';
import { recordAudit } from './audit.service.js';
import { getSettings } from './settings.service.js';

export interface CreateFamilyInput {
  family_code: string;
  parent_name: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  monthly_fee: number;
  fee_type?: FeePlan['fee_type'];
  students: { name: string; grade: string }[];
  recorded_by?: string;
}

/** Case-insensitive lookup by ledger code, optionally excluding one family id. */
async function findFamilyByCode(code: string, excludeId?: string) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter: Record<string, unknown> = { family_code: new RegExp(`^${escaped}$`, 'i') };
  if (excludeId) filter.id = { $ne: excludeId };
  return toPlain<Family>(await FamilyModel.findOne(filter).lean());
}

export async function createFamily(
  data: CreateFamilyInput
): Promise<{ success: boolean; family?: Family; message?: string }> {
  const recorder = data.recorded_by || 'Staff';

  const trimmedCode = (data.family_code || '').trim();
  if (!trimmedCode) {
    return {
      success: false,
      message:
        'Family Code / Ledger Number is mandatory. Please enter the physical ledger folio or family code.',
    };
  }

  const duplicate = await findFamilyByCode(trimmedCode);
  if (duplicate) {
    return {
      success: false,
      message: `Family Code / Ledger Number "${trimmedCode}" is already in use by ${duplicate.parent_name}. Family codes must be unique.`,
    };
  }

  const familyId = generateId('fam');
  const newFamily: Family = {
    id: familyId,
    family_code: trimmedCode,
    parent_name: data.parent_name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    notes: data.notes,
    created_at: new Date().toISOString(),
    status: 'active',
  };

  await FamilyModel.create(newFamily);

  const today = new Date().toISOString().split('T')[0];

  await StudentModel.insertMany(
    data.students.map((s) => ({
      id: generateId('stu'),
      family_id: familyId,
      name: s.name,
      grade: s.grade || 'General',
      enrollment_date: today,
      status: 'active' as const,
    }))
  );

  await FeePlanModel.create({
    id: generateId('plan'),
    family_id: familyId,
    amount: data.monthly_fee,
    fee_type: data.fee_type || 'tuition',
    billing_cycle: 'monthly',
    effective_from: today,
  });

  const settings = await getSettings();
  await recordAudit({
    entity: 'family',
    entity_id: familyId,
    action: 'create',
    performed_by: recorder,
    details: `Registered new family ${newFamily.parent_name} [Ledger Code: ${newFamily.family_code}] with ${data.students.length} student(s). Fee plan: ${settings.currency_symbol}${data.monthly_fee}/mo.`,
  });

  return { success: true, family: newFamily };
}

export async function updateFamily(
  familyId: string,
  updates: any,
  performedBy: string
): Promise<{ success: boolean; family?: Family; message?: string }> {
  const family = toPlain<Family>(await FamilyModel.findOne({ id: familyId }).lean());
  if (!family) return { success: false, message: 'Family not found.' };

  const previousState = { ...family };
  const set: Record<string, any> = {};

  if (updates.family_code !== undefined) {
    const trimmedCode = String(updates.family_code).trim();
    if (!trimmedCode) {
      return {
        success: false,
        message: 'Family Code / Ledger Number cannot be blank. It is a mandatory field.',
      };
    }
    const duplicate = await findFamilyByCode(trimmedCode, familyId);
    if (duplicate) {
      return {
        success: false,
        message: `Family Code / Ledger Number "${trimmedCode}" is already used by ${duplicate.parent_name}.`,
      };
    }
    set.family_code = trimmedCode;
  }

  if (updates.parent_name !== undefined) set.parent_name = String(updates.parent_name).trim();
  if (updates.phone !== undefined) set.phone = String(updates.phone).trim();
  if (updates.email !== undefined) set.email = String(updates.email).trim();
  if (updates.address !== undefined) set.address = String(updates.address).trim();
  if (updates.notes !== undefined) set.notes = updates.notes;
  if (updates.status !== undefined) set.status = updates.status;

  if (Object.keys(set).length > 0) {
    await FamilyModel.updateOne({ id: familyId }, { $set: set });
  }

  // Fee plan: update the amount and/or type, creating a plan when absent.
  if (updates.monthly_fee !== undefined && Number(updates.monthly_fee) > 0) {
    const updated = await FeePlanModel.updateOne(
      { family_id: familyId },
      { $set: { amount: Number(updates.monthly_fee), ...(updates.fee_type ? { fee_type: updates.fee_type } : {}) } }
    );

    if (updated.matchedCount === 0) {
      await FeePlanModel.create({
        id: generateId('plan'),
        family_id: familyId,
        amount: Number(updates.monthly_fee),
        fee_type: updates.fee_type || 'tuition',
        billing_cycle: 'monthly',
        effective_from: new Date().toISOString().split('T')[0],
      });
    }
  } else if (updates.fee_type) {
    await FeePlanModel.updateOne({ family_id: familyId }, { $set: { fee_type: updates.fee_type } });
  }

  // Roster sync: update existing students, insert new ones, retire the rest.
  if (Array.isArray(updates.students)) {
    const submitted: any[] = updates.students;
    const existingStudents = toPlain<Student[]>(
      await StudentModel.find({ family_id: familyId }).lean()
    );
    const keptIds = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

    for (const st of submitted) {
      if (!st.name || !String(st.name).trim()) continue;

      const match = st.id
        ? existingStudents.find((s) => s.id === st.id && s.family_id === familyId)
        : undefined;

      if (match) {
        await StudentModel.updateOne(
          { id: match.id },
          {
            $set: {
              name: String(st.name).trim(),
              ...(st.grade ? { grade: String(st.grade).trim() } : {}),
              ...(st.status ? { status: st.status } : {}),
            },
          }
        );
        keptIds.add(match.id);
        continue;
      }

      const newStudentId = generateId('stu');
      await StudentModel.create({
        id: newStudentId,
        family_id: familyId,
        name: String(st.name).trim(),
        grade: st.grade ? String(st.grade).trim() : 'General',
        enrollment_date: today,
        status: st.status || 'active',
      });
      keptIds.add(newStudentId);
    }

    // Anything the client no longer lists is retired rather than deleted, so
    // historical payments stay attributable.
    await StudentModel.updateMany(
      { family_id: familyId, id: { $nin: Array.from(keptIds) } },
      { $set: { status: 'inactive' } }
    );
  }

  const updatedFamily = toPlain<Family>(await FamilyModel.findOne({ id: familyId }).lean());

  await recordAudit({
    entity: 'family',
    entity_id: familyId,
    action: 'edit',
    performed_by: performedBy || 'Admin',
    details: `Updated family profile & settings for ${updatedFamily.parent_name}.`,
    previous_state: previousState,
    new_state: updatedFamily,
  });

  return { success: true, family: updatedFamily };
}

export async function deleteFamily(
  familyId: string,
  performedBy: string
): Promise<{ success: boolean; message?: string }> {
  const removed = toPlain<Family>(await FamilyModel.findOneAndDelete({ id: familyId }).lean());
  if (!removed) return { success: false, message: 'Family not found.' };

  await StudentModel.updateMany({ family_id: familyId }, { $set: { status: 'inactive' } });

  await recordAudit({
    entity: 'family',
    entity_id: familyId,
    action: 'delete',
    performed_by: performedBy || 'Admin',
    details: `Deleted family ${removed.parent_name}.`,
  });

  return { success: true };
}

/** Loads every collection the dashboard aggregator needs in one round trip set. */
export async function loadCoreCollections(): Promise<{
  families: Family[];
  students: Student[];
  feePlans: FeePlan[];
  payments: Payment[];
}> {
  const [families, students, feePlans, payments] = await Promise.all([
    FamilyModel.find().lean(),
    StudentModel.find().lean(),
    FeePlanModel.find().lean(),
    PaymentModel.find().lean(),
  ]);

  return {
    families: toPlain<Family[]>(families),
    students: toPlain<Student[]>(students),
    feePlans: toPlain<FeePlan[]>(feePlans),
    payments: toPlain<Payment[]>(payments),
  };
}